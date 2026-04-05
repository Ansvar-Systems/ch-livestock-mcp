import { describe, it, expect, afterEach } from 'vitest';
import { createTestDatabase } from './helpers/seed-db.js';
import { ftsSearch, tieredFtsSearch, type Database } from '../src/db.js';

let db: Database;

afterEach(() => {
  db?.close();
});

describe('createDatabase', () => {
  it('creates all tables and metadata', () => {
    db = createTestDatabase();
    const tables = db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    const tableNames = tables.map(t => t.name).sort();
    expect(tableNames).toContain('welfare_standards');
    expect(tableNames).toContain('stocking_densities');
    expect(tableNames).toContain('housing_requirements');
    expect(tableNames).toContain('movement_rules');
    expect(tableNames).toContain('breeds');
    expect(tableNames).toContain('feed_requirements');
    expect(tableNames).toContain('animal_health');
    expect(tableNames).toContain('db_metadata');
  });

  it('has search_index FTS table', () => {
    db = createTestDatabase();
    const fts = db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='search_index'"
    );
    expect(fts.length).toBe(1);
  });

  it('seeds db_metadata correctly', () => {
    db = createTestDatabase();
    const meta = db.get<{ value: string }>(
      'SELECT value FROM db_metadata WHERE key = ?',
      ['schema_version']
    );
    expect(meta?.value).toBe('1.0');
  });
});

describe('ftsSearch', () => {
  it('returns results for a matching query', () => {
    db = createTestDatabase();
    const results = ftsSearch(db, 'Milchkuh Laufstall');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain('Milchkuh');
  });

  it('filters by species', () => {
    db = createTestDatabase();
    const results = ftsSearch(db, 'Auslauf', 20, 'Schweine');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].species).toBe('Schweine');
  });

  it('returns empty array for non-matching query', () => {
    db = createTestDatabase();
    const results = ftsSearch(db, 'xyznonexistent');
    expect(results).toEqual([]);
  });

  it('respects limit parameter', () => {
    db = createTestDatabase();
    const results = ftsSearch(db, 'Milchkuh', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });
});

describe('tieredFtsSearch', () => {
  it('returns tier information with results', () => {
    db = createTestDatabase();
    const { tier, results } = tieredFtsSearch(
      db, 'search_index',
      ['title', 'body', 'species', 'category', 'jurisdiction'],
      'Milchkuh', 20
    );
    expect(results.length).toBeGreaterThan(0);
    expect(['phrase', 'and', 'prefix', 'stemmed', 'or', 'like']).toContain(tier);
  });

  it('returns empty for blank query', () => {
    db = createTestDatabase();
    const { tier, results } = tieredFtsSearch(
      db, 'search_index',
      ['title', 'body', 'species', 'category', 'jurisdiction'],
      '', 20
    );
    expect(tier).toBe('empty');
    expect(results).toEqual([]);
  });
});
