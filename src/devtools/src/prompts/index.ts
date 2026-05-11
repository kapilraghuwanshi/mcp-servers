import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer): void {
  // ─── HELP PROMPT ───────────────────────────────────────────────────────────
  server.prompt(
    "devtools_help",
    "Get help and examples on how to use the devtools MCP server",
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: "Please explain what tools are available in the devtools MCP server and give me a few examples of how I can use them to decode JWTs, check IPs, or hash strings."
        }
      }]
    })
  );

  // ─── DEBUG URL PROMPT ──────────────────────────────────────────────────────
  server.prompt(
    "debug_api_endpoint",
    "A prompt to help debug a specific API endpoint or URL",
    {
      url: z.string().url().describe("The URL of the API endpoint to debug")
    },
    (args) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `I need help debugging the following API endpoint: ${args.url}. Please use the HTTP trace tool to check redirects, the HTTP headers tool to check response headers, and the DNS lookup tool if needed.`
        }
      }]
    })
  );

  // ─── AUDIT WEBSITE PROMPT ──────────────────────────────────────────────────
  server.prompt(
    "audit_website",
    "Perform a technical audit on a website domain (DNS, SSL, Ports)",
    {
      domain: z.string().describe("The domain name to audit (e.g., example.com)")
    },
    (args) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please perform a technical audit on the domain: ${args.domain}. First, check the DNS records (A, AAAA, MX). Then, verify the SSL certificate status. Finally, check if standard web ports (80, 443) are open.`
        }
      }]
    })
  );

  // ─── INVESTIGATE IP PROMPT ─────────────────────────────────────────────────
  server.prompt(
    "investigate_ip",
    "Get geographical and network information about an IP address",
    {
      ip_address: z.string().ip().describe("The IPv4 or IPv6 address to investigate")
    },
    (args) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please look up information for the IP address: ${args.ip_address}. I need to know its geographical location, ISP, ASN, and timezone.`
        }
      }]
    })
  );

  // ─── ANALYZE NPM PACKAGE PROMPT ────────────────────────────────────────────
  server.prompt(
    "analyze_npm_package",
    "Fetch details about an npm package and its associated GitHub repository",
    {
      package_name: z.string().describe("The name of the npm package (e.g., zod, react)")
    },
    (args) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `I want to evaluate the npm package: ${args.package_name}. Please get the npm info for this package, and if a GitHub repository is listed in the results, please fetch the GitHub repository stats (stars, forks, license) as well to help me decide if it's safe to use.`
        }
      }]
    })
  );
}
