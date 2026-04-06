import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import { speciesWhereClause, knownSpeciesList } from '../species-aliases.js';
import type { Database } from '../db.js';

interface StockingArgs {
  species: string;
  age_class?: string;
  housing_type?: string;
  jurisdiction?: string;
}

type DensityRow = {
  id: number; species: string; age_class: string; housing_type: string;
  animals_per_m2: number | null; regulatory_minimum: string;
};

function formatResult(
  results: DensityRow[],
  species: string,
  jurisdiction: string,
  hint?: string,
) {
  const out: Record<string, unknown> = {
    species,
    jurisdiction,
    results_count: results.length,
    results,
    _meta: buildMeta(),
  };
  if (hint) out._hint = hint;
  return out;
}

export function handleGetStockingDensity(db: Database, args: StockingArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  const sw = speciesWhereClause(args.species);

  const baseSql = `SELECT * FROM stocking_densities WHERE ${sw.clause} AND jurisdiction = ?`;
  const baseParams: unknown[] = [...sw.params, jv.jurisdiction];

  let sql = baseSql;
  const params = [...baseParams];

  if (args.age_class) {
    sql += ' AND LOWER(age_class) = LOWER(?)';
    params.push(args.age_class);
  }

  if (args.housing_type) {
    sql += ' AND LOWER(housing_type) = LOWER(?)';
    params.push(args.housing_type);
  }

  sql += ' ORDER BY age_class, housing_type';

  const results = db.all<DensityRow>(sql, params);

  if (results.length > 0) {
    return formatResult(results, args.species, jv.jurisdiction);
  }

  // Fallback: species matched but optional filters missed — show what's available
  if (args.age_class || args.housing_type) {
    const fallback = db.all<DensityRow>(
      baseSql + ' ORDER BY age_class, housing_type', baseParams,
    );
    if (fallback.length > 0) {
      const parts: string[] = [];
      if (args.age_class) {
        const available = [...new Set(fallback.map(d => d.age_class))];
        parts.push(`age_class '${args.age_class}' not found. Available: ${available.join(', ')}`);
      }
      if (args.housing_type) {
        const available = [...new Set(fallback.map(d => d.housing_type))];
        parts.push(`housing_type '${args.housing_type}' not found. Available: ${available.join(', ')}`);
      }
      return formatResult(fallback, args.species, jv.jurisdiction,
        parts.join('. ') + '. Showing all results.');
    }
  }

  return {
    error: 'not_found',
    message: `No stocking density data found for species '${args.species}'. Available species: ${knownSpeciesList()}.`,
  };
}
