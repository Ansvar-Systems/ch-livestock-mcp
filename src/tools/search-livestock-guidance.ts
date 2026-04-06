import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import { resolveSpecies } from '../species-aliases.js';
import { ftsSearch, type Database } from '../db.js';

interface SearchArgs {
  query: string;
  species?: string;
  jurisdiction?: string;
  limit?: number;
}

export function handleSearchLivestockGuidance(db: Database, args: SearchArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  const limit = Math.min(args.limit ?? 20, 50);

  // Resolve species alias before passing to FTS filter
  const resolvedSpecies = args.species ? resolveSpecies(args.species)[0] : undefined;

  const results = ftsSearch(db, args.query, limit, resolvedSpecies);

  return {
    query: args.query,
    species_filter: args.species ?? null,
    jurisdiction: jv.jurisdiction,
    results_count: results.length,
    results: results.map(r => ({
      title: r.title,
      body: r.body,
      species: r.species,
      category: r.category,
      relevance_rank: r.rank,
    })),
    _meta: buildMeta(),
  };
}
