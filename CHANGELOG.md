# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-05

### Added
- Initial release with 11 tools (3 meta + 8 domain)
- Welfare standards from TSchV (minimum) and DZV (RAUS/BTS programmes)
- Stocking density data from TSchV Anhang 1
- Housing requirement specifications (space, ventilation, flooring, temperature)
- TVD movement rules (registration, transport, standstill, Soemmerung)
- Feed requirements with GMF programme data
- Animal health records (diseases, symptoms, prevention, regulatory status)
- Swiss breed data from breed associations
- Tiered FTS5 search with automatic fallback
- Streamable HTTP transport (Docker) and stdio transport (npx)
- Bilingual disclaimer (DE/EN)
- Golden standard documentation (README, TOOLS.md, COVERAGE.md, DISCLAIMER.md)
- CI/CD: CodeQL, Gitleaks, GHCR build, npm publish, ingestion, freshness checks
- Test suite with seed database
