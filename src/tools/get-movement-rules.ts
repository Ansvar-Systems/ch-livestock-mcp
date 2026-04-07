import { buildMeta } from '../metadata.js';
import { buildCitation } from '../citation.js';
import { validateJurisdiction } from '../jurisdiction.js';
import { speciesWhereClause, knownSpeciesList } from '../species-aliases.js';
import type { Database } from '../db.js';

interface MovementArgs {
  species: string;
  rule_type?: string;
  jurisdiction?: string;
}

type MovementRow = {
  id: number; species: string; rule_type: string; description: string;
};

function formatResult(
  results: MovementRow[],
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
    _citation: buildCitation(
      `CH Movement Rules — ${species}`,
      `Swiss movement rules for ${species}`,
      'get_movement_rules',
      { species },
    ),
  };
  if (hint) out._hint = hint;
  return out;
}

export function handleGetMovementRules(db: Database, args: MovementArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  const sw = speciesWhereClause(args.species);

  const baseSql = `SELECT * FROM movement_rules WHERE ${sw.clause} AND jurisdiction = ?`;
  const baseParams: unknown[] = [...sw.params, jv.jurisdiction];

  let sql = baseSql;
  const params = [...baseParams];

  if (args.rule_type) {
    sql += ' AND LOWER(rule_type) = LOWER(?)';
    params.push(args.rule_type);
  }

  sql += ' ORDER BY rule_type';

  const results = db.all<MovementRow>(sql, params);

  if (results.length > 0) {
    return formatResult(results, args.species, jv.jurisdiction);
  }

  // Fallback: species matched but rule_type missed
  if (args.rule_type) {
    const fallback = db.all<MovementRow>(
      baseSql + ' ORDER BY rule_type', baseParams,
    );
    if (fallback.length > 0) {
      const available = [...new Set(fallback.map(d => d.rule_type))];
      return formatResult(fallback, args.species, jv.jurisdiction,
        `rule_type '${args.rule_type}' not found. Available: ${available.join(', ')}. Showing all results.`);
    }
  }

  return {
    error: 'not_found',
    message: `No movement rules found for species '${args.species}'. Available species: ${knownSpeciesList()}.`,
  };
}
