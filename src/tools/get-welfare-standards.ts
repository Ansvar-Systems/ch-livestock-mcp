import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface WelfareArgs {
  species: string;
  production_system?: string;
  jurisdiction?: string;
}

export function handleGetWelfareStandards(db: Database, args: WelfareArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  let sql = 'SELECT * FROM welfare_standards WHERE LOWER(species) = LOWER(?) AND jurisdiction = ?';
  const params: unknown[] = [args.species, jv.jurisdiction];

  if (args.production_system) {
    sql += ' AND LOWER(production_system) = LOWER(?)';
    params.push(args.production_system);
  }

  sql += ' ORDER BY production_system, requirement';

  const results = db.all<{
    id: number; species: string; production_system: string;
    requirement: string; min_space_m2: number | null; details: string;
  }>(sql, params);

  if (results.length === 0) {
    return {
      error: 'not_found',
      message: `No welfare standards found for species '${args.species}'` +
        (args.production_system ? ` with production system '${args.production_system}'` : '') +
        '. Available species: Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde.',
    };
  }

  return {
    species: args.species,
    production_system_filter: args.production_system ?? null,
    jurisdiction: jv.jurisdiction,
    results_count: results.length,
    results,
    _meta: buildMeta(),
  };
}
