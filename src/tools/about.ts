import { buildMeta } from '../metadata.js';
import { SUPPORTED_JURISDICTIONS } from '../jurisdiction.js';

export function handleAbout() {
  return {
    name: 'Switzerland Crop Nutrients MCP',
    description:
      'Swiss crop nutrient recommendations based on GRUD (Agroscope), Suisse-Bilanz (BLW), and OELN standards. ' +
      'Provides NPK planning, soil classification, nitrogen balance (Suisse-Bilanz), manure nutrient values, ' +
      'and commodity pricing for agricultural decision-making in Switzerland.',
    version: '0.1.0',
    jurisdiction: [...SUPPORTED_JURISDICTIONS],
    data_sources: ['GRUD 2017 (Agroscope)', 'Suisse-Bilanz Wegleitung (BLW)', 'AGRIDEA Duengungsplanung', 'SBV Produzentenpreise'],
    tools_count: 11,
    links: {
      homepage: 'https://ansvar.eu/open-agriculture',
      repository: 'https://github.com/ansvar-systems/ch-livestock-mcp',
      mcp_network: 'https://ansvar.ai/mcp',
    },
    _meta: buildMeta(),
  };
}
