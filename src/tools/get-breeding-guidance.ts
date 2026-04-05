import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface BreedingArgs {
  species: string;
  topic?: string;
  jurisdiction?: string;
}

export function handleGetBreedingGuidance(db: Database, args: BreedingArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  let sql = 'SELECT * FROM breeds WHERE LOWER(species) = LOWER(?) AND jurisdiction = ?';
  const params: unknown[] = [args.species, jv.jurisdiction];

  sql += ' ORDER BY name';

  const breeds = db.all<{
    id: number; species: string; name: string; purpose: string; notes: string;
  }>(sql, params);

  if (breeds.length === 0) {
    return {
      error: 'not_found',
      message: `No breed data found for species '${args.species}'. Available species: Rinder, Schweine, Schafe, Ziegen, Pferde.`,
    };
  }

  // If topic filter is given, filter breeds/notes by topic keyword
  let filtered = breeds;
  if (args.topic) {
    const topicLower = args.topic.toLowerCase();
    filtered = breeds.filter(b => {
      const text = [b.name, b.purpose, b.notes].filter(Boolean).join(' ').toLowerCase();
      return text.includes(topicLower);
    });
    // If topic filter yields nothing, return all breeds with a note
    if (filtered.length === 0) {
      filtered = breeds;
    }
  }

  return {
    species: args.species,
    topic_filter: args.topic ?? null,
    jurisdiction: jv.jurisdiction,
    results_count: filtered.length,
    results: filtered,
    _meta: buildMeta(),
  };
}
