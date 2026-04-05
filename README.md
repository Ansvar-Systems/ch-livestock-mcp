# Switzerland Livestock MCP

Swiss livestock regulations via the Model Context Protocol. Covers welfare standards (TSchV), RAUS/BTS direct payment programmes, TVD animal movement rules, housing specifications, stocking densities, feed requirements, animal health, and breed data for cattle, pigs, poultry, sheep, goats, and horses.

**Jurisdiction:** Switzerland (CH)
**Sources:** BLV (Tierschutzverordnung), BLW (Direktzahlungsverordnung), Identitas (TVD), Swiss breed associations
**Tools:** 11 (3 meta + 8 domain)
**License:** Apache-2.0

## Quick Start

### npx (stdio)

```bash
npx -y @ansvar/ch-livestock-mcp
```

### Docker

```bash
docker run -p 3000:3000 ghcr.io/ansvar-systems/ch-livestock-mcp:latest
```

### Streamable HTTP (remote)

```
https://mcp.ansvar.eu/ch-livestock/mcp
```

No authentication required.

## MCP Client Configuration

### Claude Desktop / Cursor / Windsurf

Add to your MCP client config:

```json
{
  "mcpServers": {
    "ch-livestock": {
      "command": "npx",
      "args": ["-y", "@ansvar/ch-livestock-mcp"]
    }
  }
}
```

Or use the remote endpoint:

```json
{
  "mcpServers": {
    "ch-livestock": {
      "url": "https://mcp.ansvar.eu/ch-livestock/mcp"
    }
  }
}
```

## Tools

11 tools covering Swiss livestock regulation and guidance:

| Tool | Description |
|------|-------------|
| `about` | Server metadata: name, version, coverage, data sources |
| `list_sources` | All data sources with authority, URL, license, freshness |
| `check_data_freshness` | Staleness status and refresh command |
| `search_livestock_guidance` | FTS across all livestock topics (welfare, housing, feeding, health, transport, breeds) |
| `get_welfare_standards` | TSchV minimum and RAUS/BTS programme standards per species |
| `get_stocking_density` | Animals per m2, space requirements by species, age class, housing type (TSchV Anhang 1) |
| `get_feed_requirements` | Nutritional requirements per species and production stage, including GMF programme |
| `search_animal_health` | Disease, symptom, prevention, and regulatory reporting search |
| `get_housing_requirements` | Housing specs: space, ventilation, flooring, temperature (TSchV vs. BTS) |
| `get_movement_rules` | TVD registration, transport, standstill, and Soemmerung rules |
| `get_breeding_guidance` | Swiss breed data, breeding calendars, AI (kuenstliche Besamung), genetics |

Full parameter documentation: [TOOLS.md](TOOLS.md)

## Data Sources

| Source | Authority | Coverage |
|--------|-----------|----------|
| Tierschutzverordnung (TSchV, SR 455.1) | BLV | Minimum welfare per species, space, housing, transport, slaughter |
| Direktzahlungsverordnung (DZV) -- RAUS/BTS | BLW | Outdoor access (RAUS), housing standards (BTS), payment rates per GVE |
| Tierverkehrsdatenbank (TVD) | Identitas / BLV | Animal registration, ear tags, movement reporting |
| Zuchtorganisationen | Braunvieh Schweiz, swissherdbook, Mutterkuh Schweiz, Suisseporcs | Swiss cattle, pig, sheep, goat, horse breeds |

## Data Coverage

- 45 welfare standards across 6 species and 3 production systems (TSchV-Minimum, RAUS, BTS)
- 25 stocking density records (TSchV Anhang 1)
- 14 housing requirement specifications
- 21 movement/transport rules (TVD, Transport, Soemmerung, Schlachtung)
- 25 breed records across 5 species
- 14 feed requirement specifications including GMF programme
- 13 animal health records (diseases, prevention, regulatory status)
- 157 FTS search index entries

Full coverage breakdown: [COVERAGE.md](COVERAGE.md)

## Development

```bash
npm install
npm run build
npm test
npm run lint
```

### Ingestion

```bash
npm run ingest          # Standard incremental ingest
npm run ingest:full     # Full re-ingest (--force)
npm run ingest:fetch    # Fetch sources only (--fetch-only)
npm run ingest:diff     # Show what changed (--diff-only)
```

### Running locally

```bash
npm run dev             # stdio mode (watch)
npm run start:http      # HTTP mode on port 3000
```

## Disclaimer

This data is provided for informational purposes only and does not constitute legal or veterinary advice. The authoritative sources are the Swiss Animal Welfare Ordinance (TSchV, SR 455.1), the Animal Welfare Act (TSchG, SR 455), and guidance from BLV and BLW. Always consult the cantonal veterinary authority before making livestock management decisions.

Full bilingual disclaimer: [DISCLAIMER.md](DISCLAIMER.md)

## Links

- [Ansvar Open Agriculture](https://ansvar.eu/open-agriculture)
- [MCP Network](https://ansvar.ai/mcp)
- [TOOLS.md](TOOLS.md) -- Full tool documentation
- [COVERAGE.md](COVERAGE.md) -- Data coverage details
- [SECURITY.md](SECURITY.md) -- Security policy
- [PRIVACY.md](PRIVACY.md) -- Privacy policy

## License

Apache-2.0 -- see [LICENSE](LICENSE)
