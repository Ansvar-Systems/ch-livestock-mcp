/**
 * Species alias resolution for Swiss (CH) livestock MCP.
 *
 * CH uses German species names directly in the `species` column
 * (no species table or species_id).  LLMs frequently pass English
 * names like "cattle" or "pig" — this module maps them to the
 * actual DB values: Gefluegel, Pferde, Rinder, Schafe, Schweine, Ziegen.
 */

/** Canonical species values stored in the database. */
const KNOWN_SPECIES = ['Gefluegel', 'Pferde', 'Rinder', 'Schafe', 'Schweine', 'Ziegen'];

/** Map of lowercase alias to one or more canonical species values. */
const ALIASES: Record<string, string[]> = {
  // English → Swiss German
  cattle: ['Rinder'],
  cow: ['Rinder'],
  cows: ['Rinder'],
  beef: ['Rinder'],
  dairy: ['Rinder'],
  pig: ['Schweine'],
  pigs: ['Schweine'],
  swine: ['Schweine'],
  sheep: ['Schafe'],
  goat: ['Ziegen'],
  goats: ['Ziegen'],
  horse: ['Pferde'],
  horses: ['Pferde'],
  equine: ['Pferde'],
  poultry: ['Gefluegel'],
  chicken: ['Gefluegel'],
  chickens: ['Gefluegel'],
  hen: ['Gefluegel'],
  hens: ['Gefluegel'],
  turkey: ['Gefluegel'],
  duck: ['Gefluegel'],
  // German singular / informal
  rind: ['Rinder'],
  kuh: ['Rinder'],
  schwein: ['Schweine'],
  schaf: ['Schafe'],
  ziege: ['Ziegen'],
  pferd: ['Pferde'],
  huhn: ['Gefluegel'],
  henne: ['Gefluegel'],
  geflügel: ['Gefluegel'],
  // French (Swiss romande)
  bovin: ['Rinder'],
  bovins: ['Rinder'],
  vache: ['Rinder'],
  porc: ['Schweine'],
  porcs: ['Schweine'],
  mouton: ['Schafe'],
  moutons: ['Schafe'],
  chevre: ['Ziegen'],
  chevres: ['Ziegen'],
  cheval: ['Pferde'],
  chevaux: ['Pferde'],
  volaille: ['Gefluegel'],
  poulet: ['Gefluegel'],
};

/**
 * Resolve a user-provided species string to canonical DB values.
 *
 * Resolution order:
 * 1. Exact match against KNOWN_SPECIES (case-insensitive)
 * 2. Alias table lookup
 * 3. No match — return original value (SQL will find nothing,
 *    handler returns its normal not_found message)
 */
export function resolveSpecies(input: string): string[] {
  const lower = input.toLowerCase();

  // 1. Exact match on known species (case-insensitive)
  const exact = KNOWN_SPECIES.find(s => s.toLowerCase() === lower);
  if (exact) return [exact];

  // 2. Alias lookup
  const aliased = ALIASES[lower];
  if (aliased) return aliased;

  // 3. Fallback — return as-is
  return [input];
}

/**
 * Build a SQL WHERE clause fragment for species matching.
 *
 * Returns { clause, params } where clause looks like:
 *   "(LOWER(species) IN (?, ?))"
 *
 * Uses LOWER() on the column so matching is case-insensitive.
 */
export function speciesWhereClause(
  input: string,
): { clause: string; params: string[] } {
  const resolved = resolveSpecies(input);
  const placeholders = resolved.map(() => '?').join(', ');
  return {
    clause: `(LOWER(species) IN (${placeholders}))`,
    params: resolved.map(s => s.toLowerCase()),
  };
}

/**
 * Return the list of known species for hint messages.
 */
export function knownSpeciesList(): string {
  return KNOWN_SPECIES.join(', ');
}
