import { buildMeta } from '../metadata.js';
import { SUPPORTED_JURISDICTIONS } from '../jurisdiction.js';

export function handleAbout() {
  return {
    name: 'Switzerland Livestock MCP',
    description:
      'Swiss livestock regulations based on the Tierschutzverordnung (TSchV), RAUS/BTS programmes (DZV), ' +
      'TVD animal movement database, and breed registry data. Covers welfare standards, space requirements, ' +
      'housing specifications, transport rules, feed requirements, animal health, and breeding guidance ' +
      'for cattle, pigs, poultry, sheep, goats, and horses in Switzerland.',
    version: '0.1.0',
    jurisdiction: [...SUPPORTED_JURISDICTIONS],
    data_sources: [
      'Tierschutzverordnung TSchV (BLV)',
      'Direktzahlungsverordnung DZV — RAUS/BTS (BLW)',
      'Tierverkehrsdatenbank TVD (Identitas)',
      'Zuchtorganisationen (Braunvieh Schweiz, swissherdbook, Mutterkuh Schweiz, Suisseporcs)',
    ],
    tools_count: 11,
    links: {
      homepage: 'https://ansvar.eu/open-agriculture',
      repository: 'https://github.com/ansvar-systems/ch-livestock-mcp',
      mcp_network: 'https://ansvar.ai/mcp',
    },
    _meta: buildMeta(),
  };
}
