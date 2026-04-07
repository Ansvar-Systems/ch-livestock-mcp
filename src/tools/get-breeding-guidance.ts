import { buildMeta } from '../metadata.js';
import { buildCitation } from '../citation.js';
import { validateJurisdiction } from '../jurisdiction.js';
import { speciesWhereClause, knownSpeciesList } from '../species-aliases.js';
import type { Database } from '../db.js';

interface BreedingArgs {
  species: string;
  topic?: string;
  jurisdiction?: string;
}

type BreedRow = {
  id: number; species: string; name: string; purpose: string; notes: string;
};

function formatResult(
  results: BreedRow[],
  species: string,
  jurisdiction: string,
  hint?: string,
) {
  const out: Record<string, unknown> = {
    species,
    topic_filter: null as string | null,
    jurisdiction,
    results_count: results.length,
    results,
    _meta: buildMeta(),
    _citation: buildCitation(
      `CH Breeding Guidance — ${species}`,
      `Swiss breeding guidance for ${species}`,
      'get_breeding_guidance',
      { species },
    ),
  };
  if (hint) out._hint = hint;
  return out;
}

export function handleGetBreedingGuidance(db: Database, args: BreedingArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  const sw = speciesWhereClause(args.species);

  const sql = `SELECT * FROM breeds WHERE ${sw.clause} AND jurisdiction = ? ORDER BY name`;
  const params: unknown[] = [...sw.params, jv.jurisdiction];

  const breeds = db.all<BreedRow>(sql, params);

  if (breeds.length === 0) {
    return {
      error: 'not_found',
      message: `No breed data found for species '${args.species}'. Available species: ${knownSpeciesList()}.`,
    };
  }

  // If topic filter is given, filter breeds/notes by topic keyword
  let filtered = breeds;
  if (args.topic) {
    const topicLower = args.topic.toLowerCase();
    filtered = breeds.filter(b => {
      const text = [b.name, b.purpose, b.notes].filter(Boolean).join(' ').toLowerCase();
      return text.includes(topicLower);
    });
    // If topic filter yields nothing, return all breeds with a hint
    if (filtered.length === 0) {
      const topics = [...new Set(breeds.map(b => b.purpose).filter(Boolean))];
      const result = formatResult(breeds, args.species, jv.jurisdiction,
        `topic '${args.topic}' not found. Available purposes: ${topics.join(', ')}. Showing all results.`);
      result.topic_filter = args.topic;
      return result;
    }
  }

  const result = formatResult(filtered, args.species, jv.jurisdiction);
  result.topic_filter = args.topic ?? null;
  return result;
}
