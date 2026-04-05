import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface MovementArgs {
  species: string;
  rule_type?: string;
  jurisdiction?: string;
}

export function handleGetMovementRules(db: Database, args: MovementArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  let sql = 'SELECT * FROM movement_rules WHERE LOWER(species) = LOWER(?) AND jurisdiction = ?';
  const params: unknown[] = [args.species, jv.jurisdiction];

  if (args.rule_type) {
    sql += ' AND LOWER(rule_type) = LOWER(?)';
    params.push(args.rule_type);
  }

  sql += ' ORDER BY rule_type';

  const results = db.all<{
    id: number; species: string; rule_type: string; description: string;
  }>(sql, params);

  if (results.length === 0) {
    return {
      error: 'not_found',
      message: `No movement rules found for species '${args.species}'` +
        (args.rule_type ? ` rule type '${args.rule_type}'` : '') + '.',
    };
  }

  return {
    species: args.species,
    rule_type_filter: args.rule_type ?? null,
    jurisdiction: jv.jurisdiction,
    results_count: results.length,
    results,
    _meta: buildMeta(),
  };
}
