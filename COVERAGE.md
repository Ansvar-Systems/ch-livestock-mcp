# Data Coverage -- Switzerland Livestock MCP

**Jurisdiction:** Switzerland (CH)
**Last ingest:** 2026-04-05
**Schema version:** 1.0

## Summary

| Table | Records | Description |
|-------|---------|-------------|
| welfare_standards | 45 | TSchV minimum + RAUS/BTS programme standards per species |
| stocking_densities | 25 | Animals per m2 by species, age class, housing type (TSchV Anhang 1) |
| housing_requirements | 14 | Space, ventilation, flooring, temperature specs |
| movement_rules | 21 | TVD registration, transport, standstill, Soemmerung, Schlachtung |
| breeds | 25 | Swiss breed records across 5 species |
| feed_requirements | 14 | Nutritional requirements per species and production stage |
| animal_health | 13 | Diseases, symptoms, prevention, regulatory reporting |
| search_index (FTS) | 157 | Full-text search entries across all categories |

**Total:** 157 indexed records, 11 tools

## Species Coverage

| Species (DE) | Species (EN) | Welfare | Stocking | Housing | Movement | Breeds | Feed | Health |
|-------------|-------------|---------|----------|---------|----------|--------|------|--------|
| Rinder | Cattle | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Schweine | Pigs | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Gefluegel | Poultry | Yes | Yes | Yes | Yes | No | Yes | Yes |
| Schafe | Sheep | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Ziegen | Goats | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Pferde | Horses | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

## Production Systems

- **TSchV-Minimum** -- Legal minimum welfare standards per Tierschutzverordnung
- **RAUS** -- Regelmaessiger Auslauf ins Freie (regular outdoor access), DZV direct payment programme
- **BTS** -- Besonders tierfreundliche Stallhaltungssysteme (particularly animal-friendly housing systems), DZV direct payment programme
- **GMF** -- Graslandbasierte Milch- und Fleischproduktion (grassland-based milk and meat production)

## Data Sources

| Source | Authority | Retrieval | Update Frequency |
|--------|-----------|-----------|-----------------|
| Tierschutzverordnung (TSchV, SR 455.1) | BLV | PDF extract | Periodic (amended as needed) |
| Direktzahlungsverordnung (DZV) -- RAUS/BTS | BLW | PDF extract | Annual |
| Tierverkehrsdatenbank (TVD) | Identitas / BLV | Public docs | Continuous |
| Zuchtorganisationen | Braunvieh Schweiz, swissherdbook, Mutterkuh Schweiz, Suisseporcs | Public docs | Annual |

## Known Gaps

- **Cantonal extensions:** TSchV sets federal minimums. Some cantons impose stricter rules (e.g. BE, ZH). Not covered.
- **Bio Suisse / IP-Suisse:** Organic and IP label standards are not included. Only TSchV + RAUS/BTS.
- **Aquaculture:** Fish farming (Fischzucht) is not covered.
- **Bees:** Apiculture (Bienenhaltung) is not covered.
- **Camelids:** Lamas, alpacas, and other Neuweltkameliden are not covered.
- **Wild animals in captivity:** Zoo and circus animal regulations are not covered.
- **Historical amendments:** Only the current consolidated version of TSchV is indexed. Amendment history is not tracked.
- **Enforcement data:** Cantonal inspection statistics and enforcement actions are not included.

## Freshness

Data staleness threshold: 90 days. Automated freshness check runs daily via `check-freshness.yml`. Ingestion is triggered via `ingest.yml` workflow (manual or scheduled).
