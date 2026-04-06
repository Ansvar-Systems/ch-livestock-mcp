import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import { speciesWhereClause, knownSpeciesList } from '../species-aliases.js';
import type { Database } from '../db.js';

interface WelfareArgs {
  species: string;
  production_system?: string;
  jurisdiction?: string;
}

type WelfareRow = {
  id: number; species: string; production_system: string;
  requirement: string; min_space_m2: number | null; details: string;
};

function formatResult(
  results: WelfareRow[],
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

export function handleGetWelfareStandards(db: Database, args: WelfareArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  const sw = speciesWhereClause(args.species);

  const baseSql = `SELECT * FROM welfare_standards WHERE ${sw.clause} AND jurisdiction = ?`;
  const baseParams: unknown[] = [...sw.params, jv.jurisdiction];

  let sql = baseSql;
  const params = [...baseParams];

  if (args.production_system) {
    sql += ' AND LOWER(production_system) = LOWER(?)';
    params.push(args.production_system);
  }

  sql += ' ORDER BY production_system, requirement';

  const results = db.all<WelfareRow>(sql, params);

  if (results.length > 0) {
    return formatResult(results, args.species, jv.jurisdiction);
  }

  // Fallback: species matched but production_system missed
  if (args.production_system) {
    const fallback = db.all<WelfareRow>(
      baseSql + ' ORDER BY production_system, requirement', baseParams,
    );
    if (fallback.length > 0) {
      const available = [...new Set(fallback.map(s => s.production_system).filter(Boolean))];
      return formatResult(fallback, args.species, jv.jurisdiction,
        `production_system '${args.production_system}' not found. Available: ${available.join(', ')}. Showing all results.`);
    }
  }

  return {
    error: 'not_found',
    message: `No welfare standards found for species '${args.species}'. Available species: ${knownSpeciesList()}.`,
  };
}
