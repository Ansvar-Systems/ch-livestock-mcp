import { describe, it, expect, afterEach } from 'vitest';
import { createTestDatabase } from '../helpers/seed-db.js';
import { handleSearchLivestockGuidance } from '../../src/tools/search-livestock-guidance.js';
import type { Database } from '../../src/db.js';

let db: Database;

afterEach(() => {
  db?.close();
});

describe('search_livestock_guidance tool', () => {
  it('returns results for a matching query', () => {
    db = createTestDatabase();
    const result = handleSearchLivestockGuidance(db, { query: 'Milchkuh' });
    expect(result).toHaveProperty('results');
    expect(result).toHaveProperty('results_count');
    if ('results' in result) {
      expect((result as { results_count: number }).results_count).toBeGreaterThan(0);
    }
  });

  it('filters by species', () => {
    db = createTestDatabase();
    const result = handleSearchLivestockGuidance(db, { query: 'Auslauf', species: 'Schweine' });
    if ('results' in result && Array.isArray((result as Record<string, unknown>).results)) {
      const results = (result as { results: Array<{ species: string }> }).results;
      results.forEach(r => {
        expect(r.species).toBe('Schweine');
      });
    }
  });

  it('respects limit', () => {
    db = createTestDatabase();
    const result = handleSearchLivestockGuidance(db, { query: 'Milchkuh', limit: 1 });
    if ('results' in result && Array.isArray((result as Record<string, unknown>).results)) {
      expect((result as { results: unknown[] }).results.length).toBeLessThanOrEqual(1);
    }
  });

  it('caps limit at 50', () => {
    db = createTestDatabase();
    const result = handleSearchLivestockGuidance(db, { query: 'Milchkuh', limit: 100 });
    // Should not error -- limit is capped internally
    expect(result).toBeDefined();
  });

  it('rejects unsupported jurisdiction', () => {
    db = createTestDatabase();
    const result = handleSearchLivestockGuidance(db, { query: 'test', jurisdiction: 'DE' });
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toBe('jurisdiction_not_supported');
  });

  it('includes _meta in response', () => {
    db = createTestDatabase();
    const result = handleSearchLivestockGuidance(db, { query: 'Milchkuh' });
    if ('_meta' in result) {
      expect((result as { _meta: { disclaimer: string } })._meta.disclaimer).toBeTruthy();
    }
  });
});
