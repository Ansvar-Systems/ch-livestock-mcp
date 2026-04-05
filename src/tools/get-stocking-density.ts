import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface StockingArgs {
  species: string;
  age_class?: string;
  housing_type?: string;
  jurisdiction?: string;
}

export function handleGetStockingDensity(db: Database, args: StockingArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  let sql = 'SELECT * FROM stocking_densities WHERE LOWER(species) = LOWER(?) AND jurisdiction = ?';
  const params: unknown[] = [args.species, jv.jurisdiction];

  if (args.age_class) {
    sql += ' AND LOWER(age_class) = LOWER(?)';
    params.push(args.age_class);
  }

  if (args.housing_type) {
    sql += ' AND LOWER(housing_type) = LOWER(?)';
    params.push(args.housing_type);
  }

  sql += ' ORDER BY age_class, housing_type';

  const results = db.all<{
    id: number; species: string; age_class: string; housing_type: string;
    animals_per_m2: number | null; regulatory_minimum: string;
  }>(sql, params);

  if (results.length === 0) {
    return {
      error: 'not_found',
      message: `No stocking density data found for species '${args.species}'` +
        (args.age_class ? ` age class '${args.age_class}'` : '') +
        (args.housing_type ? ` housing type '${args.housing_type}'` : '') + '.',
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
