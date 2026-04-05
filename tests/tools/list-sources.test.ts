import { describe, it, expect, afterEach } from 'vitest';
import { createTestDatabase } from '../helpers/seed-db.js';
import { handleListSources } from '../../src/tools/list-sources.js';
import type { Database } from '../../src/db.js';

let db: Database;

afterEach(() => {
  db?.close();
});

describe('list_sources tool', () => {
  it('returns 4 data sources', () => {
    db = createTestDatabase();
    const result = handleListSources(db);
    expect(result.sources.length).toBe(4);
  });

  it('includes TSchV source', () => {
    db = createTestDatabase();
    const result = handleListSources(db);
    const tschv = result.sources.find(s => s.name.includes('TSchV'));
    expect(tschv).toBeDefined();
    expect(tschv!.authority).toContain('BLV');
    expect(tschv!.official_url).toContain('fedlex.admin.ch');
  });

  it('includes DZV RAUS/BTS source', () => {
    db = createTestDatabase();
    const result = handleListSources(db);
    const dzv = result.sources.find(s => s.name.includes('DZV'));
    expect(dzv).toBeDefined();
    expect(dzv!.authority).toContain('BLW');
  });

  it('includes TVD source', () => {
    db = createTestDatabase();
    const result = handleListSources(db);
    const tvd = result.sources.find(s => s.name.includes('TVD'));
    expect(tvd).toBeDefined();
    expect(tvd!.authority).toContain('Identitas');
  });

  it('includes last_retrieved from db_metadata', () => {
    db = createTestDatabase();
    const result = handleListSources(db);
    expect(result.sources[0].last_retrieved).toBe('2026-04-05');
  });

  it('includes _meta', () => {
    db = createTestDatabase();
    const result = handleListSources(db);
    expect(result._meta).toBeDefined();
    expect(result._meta.disclaimer).toBeTruthy();
  });
});
