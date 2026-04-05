export interface Meta {
  disclaimer: string;
  data_age: string;
  source_url: string;
  copyright: string;
  server: string;
  version: string;
}

const DISCLAIMER =
  'Diese Daten dienen ausschliesslich der Information und stellen keine professionelle landwirtschaftliche ' +
  'Beratung dar. Vor Duengemassnahmen ist stets eine qualifizierte Fachberatung (kantonale Fachstelle, ' +
  'AGRIDEA oder akkreditierter Berater) hinzuzuziehen. Die Daten basieren auf den Grundlagen fuer die ' +
  'Duengung (GRUD, Agroscope), der Suisse-Bilanz-Wegleitung (BLW) und den OELN-Richtlinien. Kantonale ' +
  'Abweichungen und betriebsspezifische Anpassungen sind eigenstaendig zu pruefen. / ' +
  'This data is provided for informational purposes only and does not constitute professional agricultural ' +
  'advice. Always consult a qualified agronomist before making nutrient management decisions. Data sourced ' +
  'from Swiss GRUD (Agroscope), Suisse-Bilanz (BLW), and OELN guidelines.';

export function buildMeta(overrides?: Partial<Meta>): Meta {
  return {
    disclaimer: DISCLAIMER,
    data_age: overrides?.data_age ?? 'unknown',
    source_url: overrides?.source_url ?? 'https://www.agroscope.admin.ch/agroscope/de/home/themen/pflanzenbau/duengung.html',
    copyright: 'Data: Agroscope, BLW, AGRIDEA — used under public-sector information principles. Server: Apache-2.0 Ansvar Systems.',
    server: 'ch-livestock-mcp',
    version: '0.1.0',
    ...overrides,
  };
}

export function buildStalenessWarning(publishedDate: string): string | undefined {
  const published = new Date(publishedDate);
  const now = new Date();
  const daysSincePublished = Math.floor(
    (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSincePublished > 14) {
    return `Price data is ${daysSincePublished} days old (published ${publishedDate}). Check current market rates before making decisions.`;
  }
  return undefined;
}
