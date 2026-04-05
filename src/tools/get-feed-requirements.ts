import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface FeedArgs {
  species: string;
  age_class?: string;
  production_stage?: string;
  jurisdiction?: string;
}

export function handleGetFeedRequirements(db: Database, args: FeedArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  let sql = 'SELECT * FROM feed_requirements WHERE LOWER(species) = LOWER(?) AND jurisdiction = ?';
  const params: unknown[] = [args.species, jv.jurisdiction];

  if (args.age_class) {
    sql += ' AND LOWER(age_class) = LOWER(?)';
    params.push(args.age_class);
  }

  if (args.production_stage) {
    sql += ' AND LOWER(production_stage) = LOWER(?)';
    params.push(args.production_stage);
  }

  sql += ' ORDER BY age_class, production_stage';

  const results = db.all<{
    id: number; species: string; age_class: string; production_stage: string;
    feed_type: string; quantity_kg_day: number | null; energy_mj: number | null;
    protein_g: number | null; notes: string;
  }>(sql, params);

  if (results.length === 0) {
    return {
      error: 'not_found',
      message: `No feed requirement data found for species '${args.species}'` +
        (args.age_class ? ` age class '${args.age_class}'` : '') +
        (args.production_stage ? ` production stage '${args.production_stage}'` : '') + '.',
    };
  }

  return {
    species: args.species,
    jurisdiction: jv.jurisdiction,
    results_count: results.length,
    results,
    _meta: buildMeta(),
  };
}
