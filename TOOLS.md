# Tools Reference -- Switzerland Livestock MCP

11 tools: 3 meta-tools + 8 domain tools. All tools return JSON with a `_meta` object containing disclaimer, data age, and source URL.

---

## Meta Tools

### `about`

Get server metadata: name, version, coverage, data sources, and links.

**Parameters:** None

**Returns:**
```json
{
  "name": "Switzerland Livestock MCP",
  "description": "Swiss livestock regulations...",
  "version": "0.1.0",
  "jurisdiction": ["CH"],
  "data_sources": ["TSchV", "DZV", "TVD", "Zuchtorganisationen"],
  "tools_count": 11,
  "links": { "homepage": "...", "repository": "...", "mcp_network": "..." },
  "_meta": { "disclaimer": "...", "data_age": "...", "source_url": "..." }
}
```

---

### `list_sources`

List all data sources with authority, URL, license, and freshness info.

**Parameters:** None

**Returns:** Array of source objects, each with `name`, `authority`, `official_url`, `retrieval_method`, `update_frequency`, `license`, `coverage`, `last_retrieved`.

**Example response (truncated):**
```json
{
  "sources": [
    {
      "name": "Tierschutzverordnung (TSchV, SR 455.1)",
      "authority": "Bundesamt fuer Lebensmittelsicherheit und Veterinaerwesen (BLV)",
      "official_url": "https://www.fedlex.admin.ch/eli/cc/2008/416/de",
      "retrieval_method": "PDF_EXTRACT",
      "update_frequency": "periodic (amended as needed)",
      "license": "Swiss Federal Administration -- free reuse",
      "coverage": "Minimum welfare standards per species, space requirements, housing, transport, slaughter"
    }
  ],
  "_meta": { ... }
}
```

---

### `check_data_freshness`

Check when data was last ingested, staleness status, and how to trigger a refresh.

**Parameters:** None

**Returns:**
```json
{
  "status": "fresh",
  "last_ingest": "2026-04-05",
  "build_date": null,
  "schema_version": "1.0",
  "days_since_ingest": 0,
  "staleness_threshold_days": 90,
  "refresh_command": "gh workflow run ingest.yml -R ansvar-systems/ch-livestock-mcp",
  "_meta": { ... }
}
```

**Staleness logic:** If `days_since_ingest > 90`, status is `stale`. If no ingest date recorded, status is `unknown`.

---

## Domain Tools

### `search_livestock_guidance`

Full-text search across all Swiss livestock topics: welfare, housing, feeding, health, transport, breeds. Uses tiered FTS5 with automatic fallback (exact phrase, AND, prefix, stemmed, OR, LIKE).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Free-text search query (German or English) |
| `species` | string | No | Filter by species (e.g. Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde) |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: CH) |
| `limit` | number | No | Max results (default: 20, max: 50) |

**Example call:**
```json
{ "query": "Mindestflaeche Milchkuh Laufstall", "species": "Rinder", "limit": 10 }
```

**Returns:** Array of results with `title`, `body`, `species`, `category`, `relevance_rank`.

**Limitations:** Search is text-based (FTS5), not semantic. German terms produce better results than English for Swiss-specific content.

---

### `get_welfare_standards`

Get legal minimum welfare requirements and RAUS/BTS programme standards for a species. Based on TSchV and DZV.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `species` | string | Yes | Species: Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde |
| `production_system` | string | No | Filter: TSchV-Minimum, RAUS, BTS |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: CH) |

**Example call:**
```json
{ "species": "Rinder", "production_system": "RAUS" }
```

**Returns:** Array of records with `id`, `species`, `production_system`, `requirement`, `min_space_m2`, `details`.

**Limitations:** Does not cover cantonal extensions to TSchV. Production system names must match exactly (case-insensitive).

---

### `get_stocking_density`

Get animals per m2 and space requirements by species, age class, and housing type. Based on TSchV Anhang 1.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `species` | string | Yes | Species: Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde |
| `age_class` | string | No | Age/weight class (e.g. Milchkuh, Kalb, Mastschwein >60kg, Legehenne) |
| `housing_type` | string | No | Housing type (e.g. Laufstall, Anbindestall, Voliere, Freilandhaltung) |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: CH) |

**Example call:**
```json
{ "species": "Schweine", "age_class": "Mastschwein >60kg" }
```

**Returns:** Array of records with `id`, `species`, `age_class`, `housing_type`, `animals_per_m2`, `regulatory_minimum`.

---

### `get_feed_requirements`

Get nutritional requirements per species and production stage. Includes GMF (graslandbasierte Milch- und Fleischproduktion) programme details.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `species` | string | Yes | Species: Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde |
| `age_class` | string | No | Age class (e.g. Milchkuh, Aufzuchtrind, Mastschwein, Legehenne) |
| `production_stage` | string | No | Production stage (e.g. Laktation, Trockenstehend, Mast, Aufzucht) |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: CH) |

**Example call:**
```json
{ "species": "Rinder", "age_class": "Milchkuh", "production_stage": "Laktation" }
```

**Returns:** Array of records with `id`, `species`, `age_class`, `production_stage`, `feed_type`, `quantity_kg_day`, `energy_mj`, `protein_g`, `notes`.

---

### `search_animal_health`

Search animal health topics: diseases, symptoms, prevention, regulatory reporting requirements. Uses substring matching across all text fields.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search query (e.g. Salmonellen, BVD, Moderhinke, Mastitis) |
| `species` | string | No | Filter by species |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: CH) |

**Example call:**
```json
{ "query": "BVD", "species": "Rinder" }
```

**Returns:** Array of records with `id`, `species`, `condition`, `symptoms`, `prevention`, `regulatory_status`, `details`.

**Limitations:** Uses substring matching (not FTS5). Short queries (1-2 chars) are filtered out.

---

### `get_housing_requirements`

Get detailed housing specifications: space, ventilation, flooring, temperature. Compares TSchV minimum vs. BTS standard.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `species` | string | Yes | Species: Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde |
| `age_class` | string | No | Age class (e.g. Milchkuh, Mastschwein, Legehenne) |
| `system` | string | No | Housing system (e.g. Laufstall, Anbindestall, Voliere, BTS) |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: CH) |

**Example call:**
```json
{ "species": "Gefluegel", "system": "Voliere" }
```

**Returns:** Array of records with `id`, `species`, `age_class`, `system`, `space`, `ventilation`, `flooring`, `temperature`.

---

### `get_movement_rules`

Get TVD registration, transport regulations, standstill rules, and Soemmerung/Alpung requirements per species.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `species` | string | Yes | Species: Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde |
| `rule_type` | string | No | Rule type: TVD, Transport, Soemmerung, Schlachtung |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: CH) |

**Example call:**
```json
{ "species": "Rinder", "rule_type": "TVD" }
```

**Returns:** Array of records with `id`, `species`, `rule_type`, `description`.

---

### `get_breeding_guidance`

Get Swiss breed information, breeding calendars, AI (kuenstliche Besamung), genetics, and Soemmerung guidance.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `species` | string | Yes | Species: Rinder, Schweine, Schafe, Ziegen, Pferde |
| `topic` | string | No | Topic filter (e.g. Zweinutzung, Milch, Fleisch, Alp) |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: CH) |

**Example call:**
```json
{ "species": "Rinder", "topic": "Milch" }
```

**Returns:** Array of breed records with `id`, `species`, `name`, `purpose`, `notes`. If topic filter yields no results, all breeds for the species are returned.

**Limitations:** Topic filtering uses substring matching on breed name, purpose, and notes fields.
