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
      name: 'Tierschutzverordnung (TSchV, SR 455.1)',
      authority: 'Bundesamt fuer Lebensmittelsicherheit und Veterinaerwesen (BLV)',
      official_url: 'https://www.fedlex.admin.ch/eli/cc/2008/416/de',
      retrieval_method: 'PDF_EXTRACT',
      update_frequency: 'periodic (amended as needed)',
      license: 'Swiss Federal Administration — free reuse',
      coverage: 'Minimum welfare standards per species, space requirements, housing, transport, slaughter',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'Direktzahlungsverordnung (DZV) — RAUS/BTS-Programme',
      authority: 'Bundesamt fuer Landwirtschaft (BLW)',
      official_url: 'https://www.blw.admin.ch/blw/de/home/instrumente/direktzahlungen/produktionssystembeitraege/tierwohlbeitraege.html',
      retrieval_method: 'PDF_EXTRACT',
      update_frequency: 'annual (with DZV updates)',
      license: 'Swiss Federal Administration — free reuse',
      coverage: 'RAUS outdoor access requirements, BTS housing standards, payment rates per GVE',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'Tierverkehrsdatenbank (TVD)',
      authority: 'Identitas AG / BLV',
      official_url: 'https://www.identitas.ch/tvd',
      retrieval_method: 'PUBLIC_DOCS',
      update_frequency: 'continuous (registration rules updated periodically)',
      license: 'Public regulatory information',
      coverage: 'Animal registration, ear tags, movement reporting, species coverage',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'Zuchtorganisationen (Braunvieh Schweiz, swissherdbook, Mutterkuh Schweiz, Suisseporcs)',
      authority: 'Various breed associations',
      official_url: 'https://www.braunvieh.ch',
      retrieval_method: 'PUBLIC_DOCS',
      update_frequency: 'annual',
      license: 'Public breed information',
      coverage: 'Swiss cattle, pig, sheep, goat, and horse breeds — characteristics, purpose, regional distribution',
      last_retrieved: lastIngest?.value,
    },
  ];

  return {
    sources,
    _meta: buildMeta(),
  };
}
