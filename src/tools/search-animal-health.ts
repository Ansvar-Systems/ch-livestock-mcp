import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import { resolveSpecies } from '../species-aliases.js';
import type { Database } from '../db.js';

interface HealthSearchArgs {
  query: string;
  species?: string;
  jurisdiction?: string;
}

export function handleSearchAnimalHealth(db: Database, args: HealthSearchArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  let sql = 'SELECT * FROM animal_health WHERE jurisdiction = ?';
  const params: unknown[] = [jv.jurisdiction];

  if (args.species) {
    const resolved = resolveSpecies(args.species);
    const placeholders = resolved.map(() => '?').join(', ');
    sql += ` AND LOWER(species) IN (${placeholders})`;
    params.push(...resolved.map(s => s.toLowerCase()));
  }

  const all = db.all<{
    id: number; species: string; condition: string; symptoms: string;
    prevention: string; regulatory_status: string; details: string;
  }>(sql, params);

  // Filter by query terms (case-insensitive substring match across all text fields)
  const queryLower = args.query.toLowerCase();
  const terms = queryLower.split(/\s+/).filter(t => t.length > 1);

  const filtered = all.filter(row => {
    const text = [row.condition, row.symptoms, row.prevention, row.details, row.regulatory_status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return terms.some(t => text.includes(t));
  });

  return {
    query: args.query,
    species_filter: args.species ?? null,
    jurisdiction: jv.jurisdiction,
    results_count: filtered.length,
    results: filtered,
    _meta: buildMeta(),
  };
}
