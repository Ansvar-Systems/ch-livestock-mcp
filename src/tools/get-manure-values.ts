import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface ManureArgs {
  animal_category?: string;
  housing_system?: string;
  jurisdiction?: string;
}

export function handleGetManureValues(db: Database, args: ManureArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  if (args.animal_category) {
    let sql = 'SELECT * FROM manure_values WHERE LOWER(animal_category) = LOWER(?) AND jurisdiction = ?';
    const params: unknown[] = [args.animal_category, jv.jurisdiction];

    if (args.housing_system) {
      sql += ' AND LOWER(housing_system) = LOWER(?)';
      params.push(args.housing_system);
    }

    const values = db.all<{
      id: number; animal_category: string; housing_system: string;
      n_per_gve: number; p2o5_per_gve: number; k2o_per_gve: number;
      nh3_loss_pct: number; notes: string;
    }>(sql, params);

    if (values.length === 0) {
      return {
        error: 'not_found',
        message: `No manure values found for '${args.animal_category}'` +
          (args.housing_system ? ` with housing system '${args.housing_system}'` : '') + '.',
      };
    }

    return {
      animal_category: args.animal_category,
      jurisdiction: jv.jurisdiction,
      results_count: values.length,
      results: values,
      _meta: buildMeta(),
    };
  }

  const all = db.all<{
    animal_category: string; housing_system: string;
    n_per_gve: number; p2o5_per_gve: number; k2o_per_gve: number;
  }>('SELECT animal_category, housing_system, n_per_gve, p2o5_per_gve, k2o_per_gve FROM manure_values WHERE jurisdiction = ? ORDER BY animal_category', [jv.jurisdiction]);

  return {
    jurisdiction: jv.jurisdiction,
    results_count: all.length,
    results: all,
    _meta: buildMeta(),
  };
}
