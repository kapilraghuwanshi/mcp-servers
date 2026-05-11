import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createHash, randomUUID, randomBytes } from "crypto";
import { z } from "zod";

export function registerComputeTools(server: McpServer): void {

  // ─── ENCODE / DECODE ───────────────────────────────────────────────────────
  server.registerTool(
    "dt_encode_decode",
    {
      title: "Encode / Decode",
      description: `Encode or decode a string using Base64, URL encoding, or HTML entities.

Args:
  - input (string): The string to process
  - operation ('encode' | 'decode'): Direction of conversion
  - format ('base64' | 'url' | 'html'): Encoding format

Returns: { result: string, format: string, operation: string }

Examples:
  - "Encode 'hello world' as base64" → result: "aGVsbG8gd29ybGQ="
  - "URL encode https://example.com/a b" → result: "https%3A%2F%2Fexample.com%2Fa%20b"
  - "HTML encode <script>alert(1)</script>" → result: "&lt;script&gt;alert(1)&lt;/script&gt;"`,
      inputSchema: {
        input: z.string().min(1).describe("The string to encode or decode"),
        operation: z.enum(["encode", "decode"]).describe("'encode' or 'decode'"),
        format: z.enum(["base64", "url", "html"]).describe("'base64', 'url', or 'html'"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ input, operation, format }) => {
      let result: string;
      try {
        if (format === "base64") {
          result = operation === "encode"
            ? Buffer.from(input, "utf8").toString("base64")
            : Buffer.from(input, "base64").toString("utf8");
        } else if (format === "url") {
          result = operation === "encode" ? encodeURIComponent(input) : decodeURIComponent(input);
        } else {
          if (operation === "encode") {
            result = input
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;");
          } else {
            result = input
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
          }
        }
        const out = { result, format, operation };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  // ─── HASH STRING ───────────────────────────────────────────────────────────
  server.registerTool(
    "dt_hash_string",
    {
      title: "Hash String",
      description: `Hash a string using MD5, SHA1, or SHA256.

Args:
  - input (string): The string to hash
  - algorithm ('md5' | 'sha1' | 'sha256'): Hash algorithm (default: sha256)

Returns: { hash: string, algorithm: string, input_length: number }`,
      inputSchema: {
        input: z.string().min(1).describe("String to hash"),
        algorithm: z.enum(["md5", "sha1", "sha256"]).default("sha256").describe("Hash algorithm"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ input, algorithm }) => {
      const hash = createHash(algorithm).update(input, "utf8").digest("hex");
      const out = { hash, algorithm, input_length: input.length };
      return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
    }
  );

  // ─── GENERATE UUID ─────────────────────────────────────────────────────────
  server.registerTool(
    "dt_generate_uuid",
    {
      title: "Generate UUID",
      description: `Generate one or more random UUID v4 or NanoID values.

Args:
  - count (number): How many to generate (1–20, default: 1)
  - type ('uuid' | 'nanoid'): Which format to generate (default: 'uuid')

Returns: { uuids: string[], count: number, type: string }`,
      inputSchema: {
        count: z.number().int().min(1).max(20).default(1).describe("Number of IDs to generate"),
        type: z.enum(["uuid", "nanoid"]).default("uuid").describe("'uuid' or 'nanoid'"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ count, type }) => {
      let uuids: string[];
      if (type === "nanoid") {
        const alphabet = "ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW";
        uuids = Array.from({ length: count }, () => {
          let id = "";
          const bytes = randomBytes(21);
          for (let i = 0; i < 21; i++) id += alphabet[bytes[i] & 63];
          return id;
        });
      } else {
        uuids = Array.from({ length: count }, () => randomUUID());
      }
      const out = { uuids, count, type };
      return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
    }
  );

  // ─── PARSE JWT ─────────────────────────────────────────────────────────────
  server.registerTool(
    "dt_parse_jwt",
    {
      title: "Parse JWT",
      description: `Decode a JWT token and display its header and payload. Does NOT verify signature.

Args:
  - token (string): The JWT token string (with or without 'Bearer ' prefix)

Returns: { header: object, payload: object, signature: string, expires_at?: string, expired?: boolean }`,
      inputSchema: {
        token: z.string().min(10).describe("JWT token string"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ token }) => {
      try {
        const clean = token.replace(/^Bearer\s+/i, "").trim();
        const parts = clean.split(".");
        if (parts.length !== 3) throw new Error("Invalid JWT: expected 3 parts separated by '.'");
        const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
        const now = Math.floor(Date.now() / 1000);
        const out: Record<string, unknown> = {
          header,
          payload,
          signature: parts[2].slice(0, 20) + "...",
        };
        if (typeof payload.exp === "number") {
          out.expires_at = new Date(payload.exp * 1000).toISOString();
          out.expired = payload.exp < now;
          out.expires_in_seconds = payload.exp - now;
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  // ─── DIFF TEXT ─────────────────────────────────────────────────────────────
  server.registerTool(
    "dt_diff_text",
    {
      title: "Diff Text",
      description: `Line-by-line diff of two text strings. Shows added (+), removed (-), and unchanged lines.

Args:
  - original (string): The original/old text
  - modified (string): The new/modified text

Returns: { diff: string, added: number, removed: number, unchanged: number }`,
      inputSchema: {
        original: z.string().describe("Original text"),
        modified: z.string().describe("Modified text"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ original, modified }) => {
      const oldLines = original.split("\n");
      const newLines = modified.split("\n");
      const diffLines: string[] = [];
      let added = 0, removed = 0, unchanged = 0;
      const maxLen = Math.max(oldLines.length, newLines.length);
      for (let i = 0; i < maxLen; i++) {
        const o = oldLines[i];
        const n = newLines[i];
        if (o === n) { diffLines.push(`  ${o ?? ""}`); unchanged++; }
        else {
          if (o !== undefined) { diffLines.push(`- ${o}`); removed++; }
          if (n !== undefined) { diffLines.push(`+ ${n}`); added++; }
        }
      }
      const out = { diff: diffLines.join("\n"), added, removed, unchanged };
      return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
    }
  );

  // ─── CONVERT CASE ──────────────────────────────────────────────────────────
  server.registerTool(
    "dt_convert_case",
    {
      title: "Convert Case",
      description: `Convert a string between naming conventions.

Args:
  - input (string): The string to convert
  - to ('camel' | 'snake' | 'kebab' | 'pascal' | 'constant' | 'title'): Target case

Returns: { result: string, from_input: string, to: string }

Examples:
  - "helloWorld" → snake: "hello_world", kebab: "hello-world", constant: "HELLO_WORLD"`,
      inputSchema: {
        input: z.string().min(1).describe("String to convert"),
        to: z.enum(["camel", "snake", "kebab", "pascal", "constant", "title"]).describe("Target case format"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ input, to }) => {
      const words = input
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_\-\s]+/g, " ")
        .trim()
        .toLowerCase()
        .split(" ")
        .filter(Boolean);
      let result: string;
      switch (to) {
        case "camel": result = words.map((w, i) => i === 0 ? w : w[0].toUpperCase() + w.slice(1)).join(""); break;
        case "snake": result = words.join("_"); break;
        case "kebab": result = words.join("-"); break;
        case "pascal": result = words.map(w => w[0].toUpperCase() + w.slice(1)).join(""); break;
        case "constant": result = words.join("_").toUpperCase(); break;
        case "title": result = words.map(w => w[0].toUpperCase() + w.slice(1)).join(" "); break;
        default: result = input;
      }
      const out = { result, from_input: input, to };
      return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
    }
  );

  // ─── FORMAT JSON ───────────────────────────────────────────────────────────
  server.registerTool(
    "dt_format_json",
    {
      title: "Format JSON",
      description: `Pretty-print or minify a JSON string. Also validates the JSON.

Args:
  - input (string): JSON string to format
  - mode ('pretty' | 'minify'): Output format (default: 'pretty')
  - indent (number): Spaces for pretty mode (default: 2)

Returns: { result: string, valid: boolean, size_before: number, size_after: number }`,
      inputSchema: {
        input: z.string().min(1).describe("JSON string"),
        mode: z.enum(["pretty", "minify"]).default("pretty").describe("'pretty' or 'minify'"),
        indent: z.number().int().min(1).max(8).default(2).describe("Indentation spaces for pretty mode"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ input, mode, indent }) => {
      try {
        const parsed: unknown = JSON.parse(input);
        const result = mode === "pretty" ? JSON.stringify(parsed, null, indent) : JSON.stringify(parsed);
        const out = { result, valid: true, size_before: input.length, size_after: result.length };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  // ─── REGEX TEST ────────────────────────────────────────────────────────────
  server.registerTool(
    "dt_regex_test",
    {
      title: "Regex Tester",
      description: `Test a regular expression against a string and return all matches and capture groups.

Args:
  - pattern (string): Regex pattern (without slashes, e.g. "\\d+")
  - input (string): String to test against
  - flags (string): Regex flags like 'g', 'i', 'gim' (default: 'g')

Returns: { matches: string[][], match_count: number, is_match: boolean }`,
      inputSchema: {
        pattern: z.string().min(1).describe("Regex pattern without delimiters"),
        input: z.string().describe("Test string"),
        flags: z.string().default("g").describe("Regex flags (g, i, m, s, etc.)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ pattern, input, flags }) => {
      try {
        const re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
        const matches: string[][] = [];
        let m: RegExpExecArray | null;
        let safety = 0;
        while ((m = re.exec(input)) !== null && safety++ < 100) {
          matches.push(Array.from(m));
          if (!flags.includes("g")) break;
        }
        const out = { matches, match_count: matches.length, is_match: matches.length > 0 };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Invalid regex: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  // ─── COLOR CONVERT ─────────────────────────────────────────────────────────
  server.registerTool(
    "dt_color_convert",
    {
      title: "Color Convert",
      description: `Convert colors between HEX, RGB, and HSL formats.

Args:
  - input (string): Color in any format: "#ff6b6b", "rgb(255,107,107)", "hsl(0,100%,71%)"

Returns: { hex: string, rgb: { r, g, b }, hsl: { h, s, l } }`,
      inputSchema: {
        input: z.string().min(2).describe("Color string in HEX, RGB, or HSL format"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ input }) => {
      try {
        let r = 0, g = 0, b = 0;
        const hex6 = input.match(/^#?([a-fA-F0-9]{6})$/);
        const hex3 = input.match(/^#?([a-fA-F0-9]{3})$/);
        const rgbMatch = input.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
        const hslMatch = input.match(/hsl\s*\(\s*(\d+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/i);
        if (hex6) {
          const v = hex6[1];
          r = parseInt(v.slice(0, 2), 16); g = parseInt(v.slice(2, 4), 16); b = parseInt(v.slice(4, 6), 16);
        } else if (hex3) {
          const v = hex3[1];
          r = parseInt(v[0] + v[0], 16); g = parseInt(v[1] + v[1], 16); b = parseInt(v[2] + v[2], 16);
        } else if (rgbMatch) {
          r = parseInt(rgbMatch[1]); g = parseInt(rgbMatch[2]); b = parseInt(rgbMatch[3]);
        } else if (hslMatch) {
          const h = parseInt(hslMatch[1]) / 360;
          const s = parseFloat(hslMatch[2]) / 100;
          const l = parseFloat(hslMatch[3]) / 100;
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          const hue = (t: number) => {
            if (t < 0) t++; if (t > 1) t--;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };
          r = Math.round(hue(h + 1 / 3) * 255); g = Math.round(hue(h) * 255); b = Math.round(hue(h - 1 / 3) * 255);
        } else {
          throw new Error("Unrecognized color format. Use #rrggbb, rgb(r,g,b), or hsl(h,s%,l%)");
        }
        const rn = r / 255, gn = g / 255, bn = b / 255;
        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
        const l = (max + min) / 2;
        const d = max - min;
        const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
        let h = 0;
        if (d !== 0) {
          if (max === rn) h = ((gn - bn) / d + 6) % 6;
          else if (max === gn) h = (bn - rn) / d + 2;
          else h = (rn - gn) / d + 4;
          h /= 6;
        }
        const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
        const out = {
          hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
          rgb: { r, g, b },
          hsl: { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) },
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  // ─── TIMESTAMP CONVERT ─────────────────────────────────────────────────────
  server.registerTool(
    "dt_timestamp_convert",
    {
      title: "Timestamp Convert",
      description: `Convert between Unix timestamps, ISO 8601, and human-readable dates.

Args:
  - input (string): A Unix timestamp (e.g. "1718000000"), ISO date (e.g. "2024-06-10T12:00:00Z"), or "now"

Returns: { unix: number, iso: string, utc: string, relative: string }`,
      inputSchema: {
        input: z.string().min(1).describe("Unix timestamp, ISO date string, or 'now'"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ input }) => {
      try {
        const date = input.trim().toLowerCase() === "now"
          ? new Date()
          : /^\d+$/.test(input.trim())
            ? new Date(parseInt(input.trim()) * 1000)
            : new Date(input.trim());
        if (isNaN(date.getTime())) throw new Error("Could not parse date. Use Unix timestamp, ISO string, or 'now'.");
        const now = Date.now();
        const diffMs = now - date.getTime();
        const diffSec = Math.abs(Math.round(diffMs / 1000));
        const relative = diffSec < 60 ? `${diffSec}s ${diffMs > 0 ? "ago" : "from now"}`
          : diffSec < 3600 ? `${Math.round(diffSec / 60)}m ${diffMs > 0 ? "ago" : "from now"}`
            : diffSec < 86400 ? `${Math.round(diffSec / 3600)}h ${diffMs > 0 ? "ago" : "from now"}`
              : `${Math.round(diffSec / 86400)}d ${diffMs > 0 ? "ago" : "from now"}`;
        const out = { unix: Math.floor(date.getTime() / 1000), iso: date.toISOString(), utc: date.toUTCString(), relative };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  // ─── URL PARSE ─────────────────────────────────────────────────────────────
  server.registerTool(
    "dt_url_parse",
    {
      title: "URL Parser",
      description: `Break a URL into its components: protocol, host, path, query params, hash.

Args:
  - url (string): Full URL to parse

Returns: { protocol, host, hostname, port, pathname, search, params, hash, origin }`,
      inputSchema: {
        url: z.string().url().describe("Full URL to parse"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ url }) => {
      try {
        const u = new URL(url);
        const params: Record<string, string> = {};
        u.searchParams.forEach((v, k) => { params[k] = v; });
        const out = {
          protocol: u.protocol,
          host: u.host,
          hostname: u.hostname,
          port: u.port || null,
          pathname: u.pathname,
          search: u.search || null,
          params,
          hash: u.hash || null,
          origin: u.origin,
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  // ─── GENERATE PASSWORD ─────────────────────────────────────────────────────
  server.registerTool(
    "dt_generate_password",
    {
      title: "Password Generator",
      description: `Generate a secure random password with customizable length and character sets.

Args:
  - length (number): Length of password (8–128, default: 16)
  - include_numbers (boolean): Include digits 0-9 (default: true)
  - include_symbols (boolean): Include special characters (default: true)
  - include_uppercase (boolean): Include A-Z (default: true)

Returns: { password: string, length: number }`,
      inputSchema: {
        length: z.number().int().min(8).max(128).default(16).describe("Password length"),
        include_numbers: z.boolean().default(true).describe("Include numbers"),
        include_symbols: z.boolean().default(true).describe("Include symbols (!@#$%^&*)"),
        include_uppercase: z.boolean().default(true).describe("Include uppercase letters"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ length, include_numbers, include_symbols, include_uppercase }) => {
      const lowercase = "abcdefghijklmnopqrstuvwxyz";
      const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const numbers = "0123456789";
      const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
      
      let charset = lowercase;
      if (include_uppercase) charset += uppercase;
      if (include_numbers) charset += numbers;
      if (include_symbols) charset += symbols;

      let password = "";
      const bytes = randomBytes(length);
      for (let i = 0; i < length; i++) {
        password += charset[bytes[i] % charset.length];
      }
      
      const out = { password, length };
      return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
    }
  );

  // ─── UNIT CONVERTER ────────────────────────────────────────────────────────
  server.registerTool(
    "dt_unit_converter",
    {
      title: "Unit Converter",
      description: `Convert values between common units like bytes (KB, MB, GB) and temperature (C, F).

Args:
  - value (number): The value to convert
  - from ('B' | 'KB' | 'MB' | 'GB' | 'TB' | 'C' | 'F' | 'K'): Source unit
  - to ('B' | 'KB' | 'MB' | 'GB' | 'TB' | 'C' | 'F' | 'K'): Target unit

Returns: { result: number, from: string, to: string }`,
      inputSchema: {
        value: z.number().describe("Value to convert"),
        from: z.enum(["B", "KB", "MB", "GB", "TB", "C", "F", "K"]).describe("Source unit"),
        to: z.enum(["B", "KB", "MB", "GB", "TB", "C", "F", "K"]).describe("Target unit"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ value, from, to }) => {
      try {
        const byteUnits = ["B", "KB", "MB", "GB", "TB"];
        const tempUnits = ["C", "F", "K"];

        // Byte conversion
        if (byteUnits.includes(from) && byteUnits.includes(to)) {
          const fromIdx = byteUnits.indexOf(from);
          const toIdx = byteUnits.indexOf(to);
          const bytes = value * Math.pow(1024, fromIdx);
          const result = bytes / Math.pow(1024, toIdx);
          const out = { result, from, to };
          return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
        }

        // Temperature conversion
        if (tempUnits.includes(from) && tempUnits.includes(to)) {
          let celsius: number;
          if (from === "C") celsius = value;
          else if (from === "F") celsius = (value - 32) * 5 / 9;
          else celsius = value - 273.15;

          let result: number;
          if (to === "C") result = celsius;
          else if (to === "F") result = (celsius * 9 / 5) + 32;
          else result = celsius + 273.15;

          const out = { result: parseFloat(result.toFixed(4)), from, to };
          return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
        }

        throw new Error("Incompatible units for conversion");
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    }
  );

  // ─── LOREM IPSUM ───────────────────────────────────────────────────────────
  server.registerTool(
    "dt_lorem_ipsum",
    {
      title: "Lorem Ipsum Generator",
      description: `Generate placeholder text for layouts and mockups.

Args:
  - count (number): Number of units to generate (default: 3)
  - units ('paragraphs' | 'sentences' | 'words'): Type of units (default: 'paragraphs')

Returns: { text: string, count: number, units: string }`,
      inputSchema: {
        count: z.number().int().min(1).max(20).default(3).describe("Number of units"),
        units: z.enum(["paragraphs", "sentences", "words"]).default("paragraphs").describe("Type of text units"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ count, units }) => {
      const words = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "ut", "enim", "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "ut", "aliquip", "ex", "ea", "commodo", "consequat"];
      
      const genWords = (n: number) => Array.from({ length: n }, () => words[Math.floor(Math.random() * words.length)]).join(" ");
      const genSentence = () => {
        const s = genWords(Math.floor(Math.random() * 10) + 5);
        return s.charAt(0).toUpperCase() + s.slice(1) + ".";
      };
      const genParagraph = () => Array.from({ length: Math.floor(Math.random() * 4) + 3 }, genSentence).join(" ");

      let text = "";
      if (units === "words") text = genWords(count);
      else if (units === "sentences") text = Array.from({ length: count }, genSentence).join(" ");
      else text = Array.from({ length: count }, genParagraph).join("\n\n");

      const out = { text, count, units };
      return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
    }
  );

  // ─── SQL FORMATTER ─────────────────────────────────────────────────────────
  server.registerTool(
    "dt_format_sql",
    {
      title: "SQL Formatter",
      description: `Basic SQL formatting to improve readability. Uppercases keywords and adds basic indentation.

Args:
  - sql (string): The SQL query to format

Returns: { formatted: string, original: string }`,
      inputSchema: {
        sql: z.string().min(1).describe("SQL query string"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ sql }) => {
      const keywords = ["SELECT", "FROM", "WHERE", "AND", "OR", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "OUTER JOIN", "ON", "AS"];
      let formatted = sql.trim();
      
      // Simple keyword uppercasing
      keywords.forEach(kw => {
        const re = new RegExp(`\\b${kw}\\b`, "gi");
        formatted = formatted.replace(re, kw);
      });

      // Basic line breaks before major keywords
      const breaks = ["SELECT", "FROM", "WHERE", "AND", "OR", "GROUP BY", "ORDER BY", "LIMIT", "SET", "JOIN", "LEFT JOIN"];
      breaks.forEach(kw => {
        const re = new RegExp(`\\s+${kw}\\b`, "g");
        formatted = formatted.replace(re, `\n${kw}`);
      });

      const out = { formatted, original: sql };
      return { content: [{ type: "text" as const, text: formatted }], structuredContent: out };
    }
  );
}
