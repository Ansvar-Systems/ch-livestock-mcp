export interface Meta {
  disclaimer: string;
  data_age: string;
  source_url: string;
  copyright: string;
  server: string;
  version: string;
}

const DISCLAIMER =
  'Diese Daten dienen ausschliesslich der Information und stellen keine Rechtsberatung oder ' +
  'veterinaermedizinische Beratung dar. Massgebend sind die Tierschutzverordnung (TSchV, SR 455.1), ' +
  'die Tierschutzgesetzgebung (TSchG, SR 455) sowie die Weisungen des BLV und BLW. Vor Entscheidungen ' +
  'zur Tierhaltung ist stets die zustaendige kantonale Veterinaerbehoerde oder eine anerkannte ' +
  'Fachberatung zu konsultieren. / ' +
  'This data is provided for informational purposes only and does not constitute legal or veterinary ' +
  'advice. The authoritative sources are the Swiss Animal Welfare Ordinance (TSchV), the Animal Welfare ' +
  'Act (TSchG), and guidance from BLV and BLW. Always consult the cantonal veterinary authority before ' +
  'making livestock management decisions.';

export function buildMeta(overrides?: Partial<Meta>): Meta {
  return {
    disclaimer: DISCLAIMER,
    data_age: overrides?.data_age ?? 'unknown',
    source_url: overrides?.source_url ?? 'https://www.blv.admin.ch/blv/de/home/tiere/tierschutz.html',
    copyright: 'Data: BLV, BLW, Agroscope, Zuchtorganisationen — used under public-sector information principles. Server: Apache-2.0 Ansvar Systems.',
    server: 'ch-livestock-mcp',
    version: '0.1.0',
    ...overrides,
  };
}
