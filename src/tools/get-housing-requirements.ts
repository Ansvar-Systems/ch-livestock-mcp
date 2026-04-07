import { buildMeta } from '../metadata.js';
import { buildCitation } from '../citation.js';
import { validateJurisdiction } from '../jurisdiction.js';
import { speciesWhereClause, knownSpeciesList } from '../species-aliases.js';
import type { Database } from '../db.js';

interface HousingArgs {
  species: string;
  age_class?: string;
  system?: string;
  jurisdiction?: string;
}

type HousingRow = {
  id: number; species: string; age_class: string; system: string;
  space: string; ventilation: string; flooring: string; temperature: string;
};

function formatResult(
  results: HousingRow[],
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
      `CH Housing Requirements — ${species}`,
      `Swiss housing requirements for ${species}`,
      'get_housing_requirements',
      { species },
    ),
  };
  if (hint) out._hint = hint;
  return out;
}

export function handleGetHousingRequirements(db: Database, args: HousingArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  const sw = speciesWhereClause(args.species);

  const baseSql = `SELECT * FROM housing_requirements WHERE ${sw.clause} AND jurisdiction = ?`;
  const baseParams: unknown[] = [...sw.params, jv.jurisdiction];

  let sql = baseSql;
  const params = [...baseParams];

  if (args.age_class) {
    sql += ' AND LOWER(age_class) = LOWER(?)';
    params.push(args.age_class);
  }

  if (args.system) {
    sql += ' AND LOWER(system) = LOWER(?)';
    params.push(args.system);
  }

  sql += ' ORDER BY age_class, system';

  const results = db.all<HousingRow>(sql, params);

  if (results.length > 0) {
    return formatResult(results, args.species, jv.jurisdiction);
  }

  // Fallback: species matched but optional filters missed
  if (args.age_class || args.system) {
    const fallback = db.all<HousingRow>(
      baseSql + ' ORDER BY age_class, system', baseParams,
    );
    if (fallback.length > 0) {
      const parts: string[] = [];
      if (args.age_class) {
        const available = [...new Set(fallback.map(d => d.age_class))];
        parts.push(`age_class '${args.age_class}' not found. Available: ${available.join(', ')}`);
      }
      if (args.system) {
        const available = [...new Set(fallback.map(d => d.system))];
        parts.push(`system '${args.system}' not found. Available: ${available.join(', ')}`);
      }
      return formatResult(fallback, args.species, jv.jurisdiction,
        parts.join('. ') + '. Showing all results.');
    }
  }

  return {
    error: 'not_found',
    message: `No housing requirements found for species '${args.species}'. Available species: ${knownSpeciesList()}.`,
  };
}
