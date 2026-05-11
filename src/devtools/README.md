# @kapilraghuwanshi/dev-tools-mcp

**Zero-config MCP server for developers.** No API keys. No secrets. Just plug it in.

22+ tools across encoding, hashing, DNS, IP geolocation, SSL, URL tracing, WHOIS, npm lookups, GitHub, and more.

[![npm version](https://img.shields.io/npm/v/@kapilraghuwanshi/dev-tools-mcp.svg)](https://www.npmjs.com/package/@kapilraghuwanshi/dev-tools-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)

---

## Quick Start

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or
`%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["@kapilraghuwanshi/dev-tools-mcp"]
    }
  }
}
```

Restart Claude Desktop — all tools are immediately available.

---

### Claude Code (CLI)

```bash
claude mcp add @kapilraghuwanshi/dev-tools-mcp -- npx @kapilraghuwanshi/dev-tools-mcp
```

---

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["@kapilraghuwanshi/dev-tools-mcp"]
    }
  }
}
```

---

### GitHub Copilot (VS Code)

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "devtools": {
      "type": "stdio",
      "command": "npx",
      "args": ["@kapilraghuwanshi/dev-tools-mcp"]
    }
  }
}
```

---

### Windsurf

Add to `~/.windsurf/mcp.json`:

```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["@kapilraghuwanshi/dev-tools-mcp"]
    }
  }
}
```

---

## Tools

### 🔵 Compute — offline, instant

| Tool | What it does |
|------|-------------|
| `dt_encode_decode` | Base64, URL, HTML encode/decode |
| `dt_hash_string` | MD5, SHA1, SHA256 hashing |
| `dt_generate_uuid` | Generate 1–20 UUID v4s or NanoIDs |
| `dt_parse_jwt` | Decode JWT header + payload (no verification) |
| `dt_diff_text` | Line-by-line diff of two strings |
| `dt_convert_case` | camelCase ↔ snake_case ↔ kebab-case ↔ PascalCase ↔ CONSTANT_CASE |
| `dt_format_json` | Pretty-print or minify JSON |
| `dt_regex_test` | Test a regex pattern, return all matches & groups |
| `dt_color_convert` | HEX ↔ RGB ↔ HSL color conversion |
| `dt_timestamp_convert` | Unix ↔ ISO ↔ UTC + relative time |
| `dt_url_parse` | Break URL into protocol, host, path, params, hash |
| `dt_generate_password` | Secure random password generator |
| `dt_unit_converter` | Convert bytes (KB, MB, GB) and temperature (C, F, K) |
| `dt_lorem_ipsum` | Generate placeholder text (words, sentences, paragraphs) |
| `dt_format_sql` | Basic SQL query formatter |

### 🌐 Network — public APIs, no auth needed

| Tool | What it does |
|------|-------------|
| `dt_my_ip` | Your public IP address |
| `dt_ip_info` | Geo, ISP, ASN, timezone for any IP |
| `dt_dns_lookup` | A, AAAA, CNAME, MX, TXT, NS, SOA records |
| `dt_http_trace` | Follow redirect chain — where does this URL go? |
| `dt_http_headers` | Inspect all HTTP response headers of any URL |
| `dt_ssl_check` | SSL cert expiry, issuer, SANs, days remaining |
| `dt_port_check` | Is TCP port X open on host Y? |
| `dt_whois_lookup` | Domain registration details, expiry, registrar |

### 📦 Lookup — developer ecosystem

| Tool | What it does |
|------|-------------|
| `dt_npm_info` | Package version, downloads, license, deps |
| `dt_github_repo` | Stars, forks, language, topics, license |
| `dt_gitignore_gen` | Generate .gitignore for any stack via gitignore.io |
| `dt_caniuse` | MDN browser compatibility lookup |

---

## Example Prompts

```
Hash this string with SHA256: "my-secret-key"
Parse this JWT and tell me when it expires
Convert "getUserById" to snake_case
Where does https://bit.ly/3xyz redirect?
Check if port 443 is open on github.com
What's the SSL cert expiry for stripe.com?
Get the npm info for the "zod" package
Generate a .gitignore for node, react, and macos
Look up the MX records for gmail.com
Convert hex color #ff6b6b to HSL
WHOIS lookup for github.com
Generate a secure 20-character password with symbols
Convert 1560 megabytes to gigabytes
What is 98.6 Fahrenheit in Celsius?
Give me 3 paragraphs of Lorem Ipsum text
Format this SQL: SELECT * FROM users WHERE active=1 ORDER BY id DESC
Generate a mock dataset of 10 users with names and UUIDs
Check if port 8080 is open on localhost
Decode this Base64 string: SGVsbG8gV29ybGQ=
Generate a NanoID with length 12
Look up browser compatibility for "WebGPU" on caniuse
What ISP and city is the IP 8.8.8.8 located in?
Audit the SSL cert and redirect chain for stripe.com
Create a .gitignore for Python, Django, and macOS
```

---

## Requirements

- Node.js 18+
- No API keys or configuration needed

---

## ☁️ Remote Deployment (SSE)

You can host this server on **Render** (100% Free Tier).

### 1. Render.com (Recommended Free Tier)
1. Fork this repo and connect it to a new [Render Web Service](https://dashboard.render.com/).
2. Set the **Root Directory** to `src/devtools`.
3. Set the **Build Command** to `npm install && npm run build`.
4. Set the **Start Command** to `node dist/index.js`.
5. Add a **PORT** environment variable: `10000`.
6. Once deployed, connect your client using your Render URL:

```json
"devtools-remote": {
  "type": "sse",
  "url": "https://mcp-servers-161f.onrender.com/sse"
}
```

> **Note**: Free tier servers "sleep" after 15 mins of inactivity. The first request after a break may take 30s to wake up.

### 2. Manual SSE Run
```bash
PORT=3000 npx @kapilraghuwanshi/dev-tools-mcp
```

---

## License

MIT © [Kapil Raghuwanshi](https://github.com/kapilraghuwanshi)
