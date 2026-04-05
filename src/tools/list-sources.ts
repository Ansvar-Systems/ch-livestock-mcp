import { buildMeta } from '../metadata.js';
import type { Database } from '../db.js';

interface Source {
  name: string;
  authority: string;
  official_url: string;
  retrieval_method: string;
  update_frequency: string;
  license: string;
  coverage: string;
  last_retrieved?: string;
}

export function handleListSources(db: Database): { sources: Source[]; _meta: ReturnType<typeof buildMeta> } {
  const lastIngest = db.get<{ value: string }>('SELECT value FROM db_metadata WHERE key = ?', ['last_ingest']);

  const sources: Source[] = [
    {
      name: 'GRUD — Grundlagen fuer die Duengung landwirtschaftlicher Kulturen in der Schweiz',
      authority: 'Agroscope',
      official_url: 'https://www.agroscope.admin.ch/agroscope/de/home/themen/pflanzenbau/duengung.html',
      retrieval_method: 'PDF_EXTRACT',
      update_frequency: 'periodic (last major revision 2017)',
      license: 'Swiss Federal Administration — free reuse',
      coverage: 'NPK+Mg norms for all Swiss crops by soil type and altitude zone',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'Suisse-Bilanz Wegleitung',
      authority: 'Bundesamt fuer Landwirtschaft (BLW)',
      official_url: 'https://www.blw.admin.ch/blw/de/home/instrumente/direktzahlungen/oekologischer-leistungsnachweis.html',
      retrieval_method: 'PDF_EXTRACT',
      update_frequency: 'annual',
      license: 'Swiss Federal Administration — free reuse',
      coverage: 'Farm-level nutrient balance methodology, correction factors, tolerance ranges',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'SBV Produzentenpreise / BLW Marktbeobachtung',
      authority: 'Schweizer Bauernverband / BLW',
      official_url: 'https://www.sbv-usp.ch/de/statistik',
      retrieval_method: 'HTML_SCRAPE',
      update_frequency: 'monthly',
      license: 'Public statistical data',
      coverage: 'Swiss agricultural commodity prices (producer level)',
      last_retrieved: lastIngest?.value,
    },
  ];

  return {
    sources,
    _meta: buildMeta(),
  };
}
