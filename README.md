# 🚀 Kapil's MCP Servers

A curated collection of high-performance [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) servers, designed to extend the capabilities of AI assistants like Claude, ChatGPT, and others.

This repository is built as a **monorepo**, making it easy to discover, build, and deploy multiple specialized MCP servers from a single location.

---

## 🛠️ Featured Servers

| Server | Package | Description | Status |
| :--- | :--- | :--- | :--- |
| [**DevTools**](./src/devtools) | [`dev-tools-mcp`](https://www.npmjs.com/package/dev-tools-mcp) | Zero-config developer tools: hash, UUID, JWT, DNS, IP, URL trace, npm lookup. | ✅ Stable |
| [**Git Helper**](./src/git-helper) | — | Advanced Git repository analysis and helper tools. | 🚧 Upcoming |

---

## 🏗️ Monorepo Structure

```text
mcp-servers/
├── src/
│   ├── devtools/          # Developer Utility Server (npm: dev-tools-mcp)
│   └── git-helper/        # Git Assistant Server (Future)
├── .github/
│   └── workflows/         # CI/CD (Build, Test, Publish)
├── LICENSE                # MIT License
├── package.json           # Root workspace config
├── tsconfig.json          # Shared TypeScript settings
└── README.md              # Repository Index
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v7 or higher for workspaces support)

### Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/kapilraghuwanshi/mcp-servers.git
cd mcp-servers
npm install
```

### Building
Build all servers at once:
```bash
npm run build
```

---

## 🔌 Using the Servers

### 📦 Using Published Packages

Once published, you can use the servers directly via `npx` without needing to clone or build the repo.

For example, to use **DevTools**, a user just runs:
```bash
npx dev-tools-mcp
```

or adds it to their MCP config (e.g., Claude Desktop):
```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["dev-tools-mcp"]
    }
  }
}
```

### 🛠️ Using Local Builds

If you want to run the servers locally from source (e.g., for development):

1. Build the server: `cd src/devtools && npm run build`
2. Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "devtools": {
      "command": "node",
      "args": ["/path/to/mcp-servers/src/devtools/dist/index.js"]
    }
  }
}
```

---

## 🤝 Contributing

We welcome contributions! To add a new server:
1. Create a new directory in `src/`.
2. Initialize it with a `package.json` and `tsconfig.json`.
3. Follow the established patterns in `src/devtools`.

---

## 📄 License

MIT © [Kapil Raghuwanshi](https://github.com/kapilraghuwanshi)
