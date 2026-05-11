import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchJson, fetchText, formatError } from "../utils/http.js";

export function registerLookupTools(server: McpServer): void {

  // ─── NPM PACKAGE INFO ──────────────────────────────────────────────────────
  server.registerTool(
    "dt_npm_info",
    {
      title: "NPM Package Info",
      description: `Fetch metadata for any npm package: version, description, weekly downloads, license, dependencies.

Args:
  - package_name (string): npm package name (e.g. "react", "@types/node")

Returns: { name, version, description, license, homepage, weekly_downloads, dependencies, dev_dependencies, dist_tags, published_at }`,
      inputSchema: {
        package_name: z.string().min(1).describe("npm package name, e.g. 'react' or '@types/node'"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ package_name }) => {
      try {
        const encoded = package_name.startsWith("@")
          ? "@" + encodeURIComponent(package_name.slice(1))
          : encodeURIComponent(package_name);

        const [meta, downloads] = await Promise.all([
          fetchJson<Record<string, unknown>>(`https://registry.npmjs.org/${encoded}`),
          fetchJson<{ downloads: number }>(`https://api.npmjs.org/downloads/point/last-week/${encoded}`).catch(() => ({ downloads: null })),
        ]);

        const distTags = meta["dist-tags"] as Record<string, string> | undefined;
        const latest = distTags?.["latest"] ?? "unknown";
        const versions = meta["versions"] as Record<string, Record<string, unknown>> | undefined;
        const latestMeta = versions?.[latest] ?? {};

        const out = {
          name: meta["name"],
          version: latest,
          description: meta["description"],
          license: latestMeta["license"] ?? meta["license"],
          homepage: latestMeta["homepage"] ?? meta["homepage"],
          repository: (latestMeta["repository"] as Record<string, string> | undefined)?.["url"] ?? null,
          weekly_downloads: (downloads as { downloads: number | null }).downloads,
          dependencies: Object.keys((latestMeta["dependencies"] as Record<string, string> | undefined) ?? {}).length,
          dev_dependencies: Object.keys((latestMeta["devDependencies"] as Record<string, string> | undefined) ?? {}).length,
          dist_tags: distTags,
          published_at: (meta["time"] as Record<string, string> | undefined)?.[latest] ?? null,
          total_versions: Object.keys(versions ?? {}).length,
          unpublished: !!(meta["unpublished"]),
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ─── GITHUB REPO INFO ──────────────────────────────────────────────────────
  server.registerTool(
    "dt_github_repo",
    {
      title: "GitHub Repo Info",
      description: `Fetch public metadata for any GitHub repository (60 requests/hour unauthenticated).

Args:
  - repo (string): GitHub repo in "owner/repo" format (e.g. "facebook/react")

Returns: { name, full_name, description, stars, forks, open_issues, language, license, topics, created_at, updated_at, homepage, default_branch }`,
      inputSchema: {
        repo: z.string().regex(/^[\w\-\.]+\/[\w\-\.]+$/, "Must be in owner/repo format").describe("GitHub repo, e.g. 'facebook/react'"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ repo }) => {
      try {
        const data = await fetchJson<Record<string, unknown>>(`https://api.github.com/repos/${repo}`, {
          headers: { "Accept": "application/vnd.github.v3+json", "User-Agent": "@kapilraghuwanshi/dev-tools-mcp" },
        });
        const out = {
          name: data["name"],
          full_name: data["full_name"],
          description: data["description"],
          stars: data["stargazers_count"],
          forks: data["forks_count"],
          open_issues: data["open_issues_count"],
          watchers: data["watchers_count"],
          language: data["language"],
          license: (data["license"] as Record<string, string> | null)?.["name"] ?? null,
          topics: data["topics"],
          created_at: data["created_at"],
          updated_at: data["updated_at"],
          pushed_at: data["pushed_at"],
          homepage: data["homepage"],
          default_branch: data["default_branch"],
          archived: data["archived"],
          fork: data["fork"],
          size_kb: data["size"],
          url: data["html_url"],
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ─── GITIGNORE GENERATOR ───────────────────────────────────────────────────
  server.registerTool(
    "dt_gitignore_gen",
    {
      title: "Gitignore Generator",
      description: `Generate a .gitignore file for any tech stack using the gitignore.io API.

Args:
  - stack (string[]): List of technologies (e.g. ["node", "react", "macos", "vscode"])
    Common options: node, python, java, go, rust, react, vue, angular, macos, windows, linux, vscode, jetbrains, terraform, docker

Returns: { gitignore: string, stack: string[] }`,
      inputSchema: {
        stack: z.array(z.string().min(1)).min(1).max(10).describe("Tech stack list, e.g. ['node', 'react', 'macos']"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ stack }) => {
      try {
        const query = stack.map(s => encodeURIComponent(s.toLowerCase())).join(",");
        const gitignore = await fetchText(`https://www.toptal.com/developers/gitignore/api/${query}`);
        const out = { gitignore, stack, char_count: gitignore.length };
        return { content: [{ type: "text" as const, text: gitignore }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );

  // ─── CANIUSE LOOKUP ────────────────────────────────────────────────────────
  server.registerTool(
    "dt_caniuse",
    {
      title: "Can I Use — Browser Support Lookup",
      description: `Check MDN browser compatibility for a CSS property or JavaScript API feature.

Args:
  - feature (string): CSS property or JS API to check (e.g. "CSS grid", "IntersectionObserver", "fetch API")

Returns MDN search results with compatibility info links.

Returns: { feature, results: [{ title, url, summary }] }`,
      inputSchema: {
        feature: z.string().min(2).describe("CSS or JS feature to look up browser support for"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ feature }) => {
      try {
        const query = encodeURIComponent(feature);
        interface MdnResult { title: string; mdn_url: string; summary: string; score: number }
        const data = await fetchJson<{ documents: MdnResult[] }>(`https://developer.mozilla.org/api/v1/search?q=${query}&locale=en-US&size=5`);
        const results = (data.documents ?? []).slice(0, 5).map(d => ({
          title: d.title,
          url: `https://developer.mozilla.org${d.mdn_url}`,
          summary: d.summary?.slice(0, 200) + (d.summary?.length > 200 ? "..." : ""),
        }));
        const out = { feature, results };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }], structuredContent: out };
      } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(e)}` }], isError: true };
      }
    }
  );
}
