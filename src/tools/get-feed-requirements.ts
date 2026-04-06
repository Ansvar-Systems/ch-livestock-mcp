import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import { speciesWhereClause, knownSpeciesList } from '../species-aliases.js';
import type { Database } from '../db.js';

interface FeedArgs {
  species: string;
  age_class?: string;
  production_stage?: string;
  jurisdiction?: string;
}

type FeedRow = {
  id: number; species: string; age_class: string; production_stage: string;
  feed_type: string; quantity_kg_day: number | null; energy_mj: number | null;
  protein_g: number | null; notes: string;
};

function formatResult(
  results: FeedRow[],
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

export function handleGetFeedRequirements(db: Database, args: FeedArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  const sw = speciesWhereClause(args.species);

  const baseSql = `SELECT * FROM feed_requirements WHERE ${sw.clause} AND jurisdiction = ?`;
  const baseParams: unknown[] = [...sw.params, jv.jurisdiction];

  let sql = baseSql;
  const params = [...baseParams];

  if (args.age_class) {
    sql += ' AND LOWER(age_class) = LOWER(?)';
    params.push(args.age_class);
  }

  if (args.production_stage) {
    sql += ' AND LOWER(production_stage) = LOWER(?)';
    params.push(args.production_stage);
  }

  sql += ' ORDER BY age_class, production_stage';

  const results = db.all<FeedRow>(sql, params);

  if (results.length > 0) {
    return formatResult(results, args.species, jv.jurisdiction);
  }

  // Fallback: species matched but optional filters missed
  if (args.age_class || args.production_stage) {
    const fallback = db.all<FeedRow>(
      baseSql + ' ORDER BY age_class, production_stage', baseParams,
    );
    if (fallback.length > 0) {
      const parts: string[] = [];
      if (args.age_class) {
        const available = [...new Set(fallback.map(d => d.age_class))];
        parts.push(`age_class '${args.age_class}' not found. Available: ${available.join(', ')}`);
      }
      if (args.production_stage) {
        const available = [...new Set(fallback.map(d => d.production_stage).filter(Boolean))];
        parts.push(`production_stage '${args.production_stage}' not found. Available: ${available.join(', ')}`);
      }
      return formatResult(fallback, args.species, jv.jurisdiction,
        parts.join('. ') + '. Showing all results.');
    }
  }

  return {
    error: 'not_found',
    message: `No feed requirement data found for species '${args.species}'. Available species: ${knownSpeciesList()}.`,
  };
}
