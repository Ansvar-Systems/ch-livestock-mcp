import BetterSqlite3 from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface Database {
  get<T>(sql: string, params?: unknown[]): T | undefined;
  all<T>(sql: string, params?: unknown[]): T[];
  run(sql: string, params?: unknown[]): void;
  close(): void;
  readonly instance: BetterSqlite3.Database;
}

export function createDatabase(dbPath?: string): Database {
  const resolvedPath =
    dbPath ??
    join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'database.db');
  const db = new BetterSqlite3(resolvedPath);

  db.pragma('journal_mode = DELETE');
  db.pragma('foreign_keys = ON');

  initSchema(db);

  return {
    get<T>(sql: string, params: unknown[] = []): T | undefined {
      return db.prepare(sql).get(...params) as T | undefined;
    },
    all<T>(sql: string, params: unknown[] = []): T[] {
      return db.prepare(sql).all(...params) as T[];
    },
    run(sql: string, params: unknown[] = []): void {
      db.prepare(sql).run(...params);
    },
    close(): void {
      db.close();
    },
    get instance() {
      return db;
    },
  };
}

function initSchema(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS welfare_standards (
      id INTEGER PRIMARY KEY,
      species TEXT NOT NULL,
      production_system TEXT NOT NULL,
      requirement TEXT NOT NULL,
      min_space_m2 REAL,
      details TEXT,
      language TEXT NOT NULL DEFAULT 'DE',
      jurisdiction TEXT NOT NULL DEFAULT 'CH'
    );

    CREATE TABLE IF NOT EXISTS stocking_densities (
      id INTEGER PRIMARY KEY,
      species TEXT NOT NULL,
      age_class TEXT NOT NULL,
      housing_type TEXT NOT NULL,
      animals_per_m2 REAL,
      regulatory_minimum TEXT,
      language TEXT NOT NULL DEFAULT 'DE',
      jurisdiction TEXT NOT NULL DEFAULT 'CH'
    );

    CREATE TABLE IF NOT EXISTS housing_requirements (
      id INTEGER PRIMARY KEY,
      species TEXT NOT NULL,
      age_class TEXT NOT NULL,
      system TEXT NOT NULL,
      space TEXT,
      ventilation TEXT,
      flooring TEXT,
      temperature TEXT,
      language TEXT NOT NULL DEFAULT 'DE',
      jurisdiction TEXT NOT NULL DEFAULT 'CH'
    );

    CREATE TABLE IF NOT EXISTS movement_rules (
      id INTEGER PRIMARY KEY,
      species TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      description TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'DE',
      jurisdiction TEXT NOT NULL DEFAULT 'CH'
    );

    CREATE TABLE IF NOT EXISTS breeds (
      id INTEGER PRIMARY KEY,
      species TEXT NOT NULL,
      name TEXT NOT NULL,
      purpose TEXT,
      notes TEXT,
      language TEXT NOT NULL DEFAULT 'DE',
      jurisdiction TEXT NOT NULL DEFAULT 'CH'
    );

    CREATE TABLE IF NOT EXISTS feed_requirements (
      id INTEGER PRIMARY KEY,
      species TEXT NOT NULL,
      age_class TEXT NOT NULL,
      production_stage TEXT,
      feed_type TEXT,
      quantity_kg_day REAL,
      energy_mj REAL,
      protein_g REAL,
      notes TEXT,
      language TEXT NOT NULL DEFAULT 'DE',
      jurisdiction TEXT NOT NULL DEFAULT 'CH'
    );

    CREATE TABLE IF NOT EXISTS animal_health (
      id INTEGER PRIMARY KEY,
      species TEXT NOT NULL,
      condition TEXT NOT NULL,
      symptoms TEXT,
      prevention TEXT,
      regulatory_status TEXT,
      details TEXT,
      language TEXT NOT NULL DEFAULT 'DE',
      jurisdiction TEXT NOT NULL DEFAULT 'CH'
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      title, body, species, category, jurisdiction
    );

    CREATE TABLE IF NOT EXISTS db_metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('schema_version', '1.0');
    INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('mcp_name', 'Switzerland Livestock MCP');
    INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('jurisdiction', 'CH');
  `);
}

const FTS_COLUMNS = ['title', 'body', 'species', 'category', 'jurisdiction'];

export function ftsSearch(
  db: Database,
  query: string,
  limit: number = 20,
  species?: string
): { title: string; body: string; species: string; category: string; jurisdiction: string; rank: number }[] {
  const { results } = tieredFtsSearch(db, 'search_index', FTS_COLUMNS, query, limit, species);
  return results as { title: string; body: string; species: string; category: string; jurisdiction: string; rank: number }[];
}

/**
 * Tiered FTS5 search with automatic fallback.
 * Tiers: exact phrase -> AND -> prefix -> stemmed prefix -> OR -> LIKE
 */
export function tieredFtsSearch(
  db: Database,
  table: string,
  columns: string[],
  query: string,
  limit: number = 20,
  species?: string
): { tier: string; results: Record<string, unknown>[] } {
  const sanitized = sanitizeFtsInput(query);
  if (!sanitized.trim()) return { tier: 'empty', results: [] };

  const columnList = columns.join(', ');
  const select = `SELECT ${columnList}, rank FROM ${table}`;
  const order = `ORDER BY rank LIMIT ?`;

  // Tier 1: Exact phrase
  const phrase = `"${sanitized}"`;
  let results = tryFts(db, select, table, order, phrase, limit, species);
  if (results.length > 0) return { tier: 'phrase', results };

  // Tier 2: AND
  const words = sanitized.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 1) {
    const andQuery = words.join(' AND ');
    results = tryFts(db, select, table, order, andQuery, limit, species);
    if (results.length > 0) return { tier: 'and', results };
  }

  // Tier 3: Prefix
  const prefixQuery = words.map(w => `${w}*`).join(' AND ');
  results = tryFts(db, select, table, order, prefixQuery, limit, species);
  if (results.length > 0) return { tier: 'prefix', results };

  // Tier 4: Stemmed prefix
  const stemmed = words.map(w => stemWord(w) + '*');
  const stemmedQuery = stemmed.join(' AND ');
  if (stemmedQuery !== prefixQuery) {
    results = tryFts(db, select, table, order, stemmedQuery, limit, species);
    if (results.length > 0) return { tier: 'stemmed', results };
  }

  // Tier 5: OR
  if (words.length > 1) {
    const orQuery = words.join(' OR ');
    results = tryFts(db, select, table, order, orQuery, limit, species);
    if (results.length > 0) return { tier: 'or', results };
  }

  // Tier 6: LIKE fallback on search_index content
  const likeConditions = words.map(() =>
    `(title LIKE ? OR body LIKE ? OR species LIKE ?)`
  ).join(' AND ');
  const likeParams = words.flatMap(w => [`%${w}%`, `%${w}%`, `%${w}%`]);
  if (species) {
    try {
      const likeResults = db.all<Record<string, unknown>>(
        `SELECT title, body, species, category, jurisdiction FROM search_index WHERE ${likeConditions} AND species LIKE ? LIMIT ?`,
        [...likeParams, `%${species}%`, limit]
      );
      if (likeResults.length > 0) return { tier: 'like', results: likeResults };
    } catch {
      // LIKE fallback failed
    }
  }
  try {
    const likeResults = db.all<Record<string, unknown>>(
      `SELECT title, body, species, category, jurisdiction FROM search_index WHERE ${likeConditions} LIMIT ?`,
      [...likeParams, limit]
    );
    if (likeResults.length > 0) return { tier: 'like', results: likeResults };
  } catch {
    // LIKE fallback failed
  }

  return { tier: 'none', results: [] };
}

function tryFts(
  db: Database, select: string, table: string,
  order: string, matchExpr: string, limit: number,
  species?: string
): Record<string, unknown>[] {
  try {
    if (species) {
      const filtered = db.all(
        `${select} WHERE ${table} MATCH ? ${order}`,
        [matchExpr, limit * 3]
      );
      return (filtered as Record<string, unknown>[]).filter(
        r => (r.species as string || '').toLowerCase().includes(species.toLowerCase())
      ).slice(0, limit);
    }
    return db.all(
      `${select} WHERE ${table} MATCH ? ${order}`,
      [matchExpr, limit]
    );
  } catch {
    return [];
  }
}

function sanitizeFtsInput(query: string): string {
  return query
    .replace(/["\u201C\u201D\u2018\u2019\uFF0C\u3001\uFF1B\u3002]/g, '"')
    .replace(/[^a-zA-Z0-9\s*"_\u00C0-\u024F-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemWord(word: string): string {
  return word
    .replace(/(ung|heit|keit|lich|isch|ieren|tion|ment|ness|able|ible|ous|ive|ing|ers|ed|es|er|en|ly|s)$/i, '');
}
