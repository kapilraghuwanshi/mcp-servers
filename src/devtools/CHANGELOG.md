# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-05-11

### Added
- Password generation tool (`dt_generate_password`)
- Unit conversion tool (`dt_unit_converter`) for bytes and temperature
- Lorem Ipsum generator (`dt_lorem_ipsum`)
- Basic SQL formatter (`dt_format_sql`)
- New MCP prompt: `generate_mock_data`

## [1.1.0] - 2025-05-11

### Added
- WHOIS domain lookup tool (`dt_whois_lookup`)
- NanoID generation support in `dt_generate_uuid`
- MCP prompts: `devtools_help`, `debug_api_endpoint`, `audit_website`, `investigate_ip`, `analyze_npm_package`
- Windsurf MCP configuration in docs
- Dynamic version reporting from `package.json`
- npm badges in README
- CHANGELOG.md, LICENSE, .npmignore

### Changed
- Renamed npm package to `dev-tools-mcp`
- Improved tool descriptions with structured Args/Returns documentation
- Added `annotations` metadata to all tools (readOnlyHint, idempotentHint, etc.)
- Enhanced README with all MCP client configurations (Claude Desktop, Claude Code, Cursor, VS Code, Windsurf)

## [1.0.0] - 2025-05-10

### Added
- Initial release with 22 developer tools
- **Compute tools**: encode/decode, hash, UUID, JWT parse, diff, case convert, JSON format, regex test, color convert, timestamp convert, URL parse
- **Network tools**: my IP, IP info, DNS lookup, HTTP trace, HTTP headers, SSL check, port check
- **Lookup tools**: npm info, GitHub repo, gitignore generator, Can I Use
- stdio and SSE transport support
- Express-based SSE server for remote deployments
