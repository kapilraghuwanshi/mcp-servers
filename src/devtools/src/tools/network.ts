import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchJson, fetchText, formatError } from "../utils/http.js";
import * as https from "https";
import * as net from "net";
import * as tls from "tls";

export function registerNetworkTools(server: McpServer): void {

  // ─── MY IP ─────────────────────────────────────────────────────────────────
  server.registerTool(
    "dt_my_ip",
    {
      title: "My Public IP",
      description: `Returns the public IP address of the machine running this MCP server.
Note: If running as a remote server, this returns the server's IP, not yours.

Returns: { ip: string }`,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async () => {
      try {
        const data = await fetchJson<{ ip: string }>("https://api.ipify.org?format=json");
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], structuredContent: data };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ─── IP INFO ───────────────────────────────────────────────────────────────
  server.registerTool(
    "dt_ip_info",
    {
      title: "IP Info & Geolocation",
      description: `Get geolocation, ISP, ASN, and timezone info for any IPv4 or IPv6 address.

Args:
  - ip (string): IPv4 or IPv6 address (e.g. "8.8.8.8"). Leave empty or pass "me" to look up your own IP.

Returns: { ip, country, region, city, isp, org, timezone, lat, lon, as }`,
      inputSchema: {
        ip: z.string().default("me").describe("IP address to look up, or 'me' for your own IP"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ ip }) => {
      try {
        const target = ip === "me" ? "" : `/${ip}`;
        const data = await fetchJson<Record<string, unknown>>(`http://ip-api.com/json${target}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
        if (data["status"] === "fail") throw new Error(String(data["message"] ?? "IP lookup failed"));
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], structuredContent: data };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ─── DNS LOOKUP ────────────────────────────────────────────────────────────
  server.registerTool(
    "dt_dns_lookup",
    {
      title: "DNS Lookup",
      description: `Look up DNS records for a domain using Google's DNS-over-HTTPS API.

Args:
  - domain (string): Domain name to look up (e.g. "github.com")
  - type ('A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA'): Record type (default: 'A')

Returns: { domain, type, answers: [{ name, type, ttl, data }] }`,
      inputSchema: {
        domain: z.string().min(3).describe("Domain name to look up"),
        type: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA"]).default("A").describe("DNS record type"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ domain, type }) => {
      try {
        interface DnsResponse {
          Status: number;
          Answer?: Array<{ name: string; type: number; TTL: number; data: string }>;
          Authority?: Array<{ name: string; type: number; TTL: number; data: string }>;
        }
        const data = await fetchJson<DnsResponse>(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`);
        const typeMap: Record<number, string> = { 1: "A", 28: "AAAA", 5: "CNAME", 15: "MX", 16: "TXT", 2: "NS", 6: "SOA" };
        const answers = (data.Answer ?? data.Authority ?? []).map(a => ({
          name: a.name, type: typeMap[a.type] ?? String(a.type), ttl: a.TTL, data: a.data,
        }));
        const out = { domain, type, answers, answer_count: answers.length };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ─── HTTP TRACE (where does this URL go) ───────────────────────────────────
  server.registerTool(
    "dt_http_trace",
    {
      title: "HTTP Trace / URL Redirect Follower",
      description: `Follow the full redirect chain of a URL and show every hop until final destination.
Useful for short URLs, tracking redirects, or debugging link behaviour.

Args:
  - url (string): The URL to trace (e.g. "https://bit.ly/xyz")
  - max_redirects (number): Max hops to follow (default: 10)

Returns: { hops: [{ step, url, status, status_text }], final_url, total_hops }`,
      inputSchema: {
        url: z.string().url().describe("URL to trace"),
        max_redirects: z.number().int().min(1).max(20).default(10).describe("Max redirects to follow"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ url, max_redirects }) => {
      try {
        const hops: Array<{ step: number; url: string; status: number; status_text: string }> = [];
        let current = url;
        for (let i = 0; i < max_redirects; i++) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          let res: Response;
          try {
            res = await fetch(current, { method: "HEAD", redirect: "manual", signal: controller.signal });
          } finally {
            clearTimeout(timeout);
          }
          hops.push({ step: i + 1, url: current, status: res.status, status_text: res.statusText });
          if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
            const next = res.headers.get("location")!;
            current = next.startsWith("http") ? next : new URL(next, current).toString();
          } else {
            break;
          }
        }
        const out = { hops, final_url: current, total_hops: hops.length };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ─── HTTP HEADERS ──────────────────────────────────────────────────────────
  server.registerTool(
    "dt_http_headers",
    {
      title: "HTTP Headers Inspector",
      description: `Fetch the HTTP response headers of any public URL without downloading the body.
Useful for checking CORS, caching, security headers, content-type, and more.

Args:
  - url (string): Public URL to inspect

Returns: { url, status, status_text, headers: Record<string, string> }`,
      inputSchema: {
        url: z.string().url().describe("URL to inspect headers"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ url }) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let res: Response;
        try {
          res = await fetch(url, { method: "HEAD", signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }
        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => { headers[k] = v; });
        const out = { url, status: res.status, status_text: res.statusText, headers };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ─── SSL CHECKER ───────────────────────────────────────────────────────────
  server.registerTool(
    "dt_ssl_check",
    {
      title: "SSL Certificate Checker",
      description: `Check the SSL/TLS certificate of any domain: expiry date, issuer, SANs, and validity.

Args:
  - domain (string): Domain name to check (e.g. "github.com")
  - port (number): HTTPS port (default: 443)

Returns: { domain, valid, subject, issuer, valid_from, valid_to, days_remaining, san, protocol }`,
      inputSchema: {
        domain: z.string().min(3).describe("Domain to check SSL for"),
        port: z.number().int().min(1).max(65535).default(443).describe("Port number (default: 443)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ domain, port }) => {
      return new Promise((resolve) => {
        const socket = tls.connect({ host: domain, port, servername: domain, rejectUnauthorized: false }, () => {
          const cert = socket.getPeerCertificate(true);
          socket.destroy();
          if (!cert || !cert.subject) {
            resolve({ content: [{ type: "text" as const, text: "Error: Could not retrieve certificate." }], isError: true });
            return;
          }
          const validTo = new Date(cert.valid_to);
          const now = new Date();
          const daysRemaining = Math.floor((validTo.getTime() - now.getTime()) / 86400000);
          const out = {
            domain,
            valid: daysRemaining > 0,
            subject: cert.subject,
            issuer: cert.issuer,
            valid_from: cert.valid_from,
            valid_to: cert.valid_to,
            days_remaining: daysRemaining,
            san: (cert.subjectaltname ?? "").split(", ").map(s => s.replace("DNS:", "")),
            protocol: (socket as tls.TLSSocket & { getProtocol?: () => string }).getProtocol?.() ?? "unknown",
          };
          resolve({ content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out });
        });
        socket.on("error", (e: Error) => {
          resolve({ content: [{ type: "text" as const, text: `Error: ${e.message}` }], isError: true });
        });
        socket.setTimeout(8000, () => {
          socket.destroy();
          resolve({ content: [{ type: "text" as const, text: "Error: SSL check timed out." }], isError: true });
        });
      });
    }
  );

  // ─── PORT CHECK ────────────────────────────────────────────────────────────
  server.registerTool(
    "dt_port_check",
    {
      title: "Port Checker",
      description: `Check if a TCP port is open and reachable on a given host.

Args:
  - host (string): Hostname or IP address (e.g. "github.com", "192.168.1.1")
  - port (number): TCP port to check (1–65535)

Returns: { host, port, open: boolean, response_time_ms: number | null }`,
      inputSchema: {
        host: z.string().min(1).describe("Hostname or IP address"),
        port: z.number().int().min(1).max(65535).describe("TCP port to check"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ host, port }) => {
      return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        socket.setTimeout(5000);
        socket.connect(port, host, () => {
          const ms = Date.now() - start;
          socket.destroy();
          const out = { host, port, open: true, response_time_ms: ms };
          resolve({ content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out });
        });
        socket.on("error", () => {
          socket.destroy();
          const out = { host, port, open: false, response_time_ms: null };
          resolve({ content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out });
        });
        socket.on("timeout", () => {
          socket.destroy();
          const out = { host, port, open: false, response_time_ms: null };
          resolve({ content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out });
        });
      });
    }
  );

  // ─── WHOIS LOOKUP ──────────────────────────────────────────────────────────
  server.registerTool(
    "dt_whois_lookup",
    {
      title: "WHOIS Lookup",
      description: `Get domain registration details (WHOIS) for any domain.
Find out when a domain was registered, when it expires, and registrar info.

Args:
  - domain (string): Domain name to look up (e.g. "github.com")

Returns: { domain, registrar, created_date, expiry_date, status, nameservers, raw_text }`,
      inputSchema: {
        domain: z.string().min(3).describe("Domain name to look up WHOIS for"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ domain }) => {
      try {
        // freeaiapi.io provides a simple JSON endpoint for WHOIS
        const url = `https://whois.freeaiapi.io/api/v1/whois?domain=${encodeURIComponent(domain)}`;
        const data = await fetchJson<Record<string, unknown>>(url);

        // Ensure we handle basic errors
        if (data.status === 'error' || data.code !== 200) {
          throw new Error(String(data.message ?? "WHOIS lookup failed"));
        }

        const info = data.data as Record<string, unknown> | undefined;
        if (!info) {
          throw new Error("No WHOIS data returned");
        }

        const out = {
          domain,
          registrar: info.registrar,
          created_date: info.creation_date,
          expiry_date: info.expiration_date,
          updated_date: info.updated_date,
          status: info.domain_status,
          nameservers: info.name_servers,
          raw_text: info.raw_text
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );
}
