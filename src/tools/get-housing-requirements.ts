import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface HousingArgs {
  species: string;
  age_class?: string;
  system?: string;
  jurisdiction?: string;
}

export function handleGetHousingRequirements(db: Database, args: HousingArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  let sql = 'SELECT * FROM housing_requirements WHERE LOWER(species) = LOWER(?) AND jurisdiction = ?';
  const params: unknown[] = [args.species, jv.jurisdiction];

  if (args.age_class) {
    sql += ' AND LOWER(age_class) = LOWER(?)';
    params.push(args.age_class);
  }

  if (args.system) {
    sql += ' AND LOWER(system) = LOWER(?)';
    params.push(args.system);
  }

  sql += ' ORDER BY age_class, system';

  const results = db.all<{
    id: number; species: string; age_class: string; system: string;
    space: string; ventilation: string; flooring: string; temperature: string;
  }>(sql, params);

  if (results.length === 0) {
    return {
      error: 'not_found',
      message: `No housing requirements found for species '${args.species}'` +
        (args.age_class ? ` age class '${args.age_class}'` : '') +
        (args.system ? ` system '${args.system}'` : '') + '.',
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
