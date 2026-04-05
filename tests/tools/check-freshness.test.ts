import { describe, it, expect, afterEach } from 'vitest';
import { createTestDatabase } from '../helpers/seed-db.js';
import { handleCheckFreshness } from '../../src/tools/check-freshness.js';
import type { Database } from '../../src/db.js';

let db: Database;

afterEach(() => {
  db?.close();
});

describe('check_data_freshness tool', () => {
  it('returns fresh status for recent data', () => {
    db = createTestDatabase();
    const result = handleCheckFreshness(db);
    expect(result.status).toBe('fresh');
    expect(result.last_ingest).toBe('2026-04-05');
    expect(result.days_since_ingest).toBeTypeOf('number');
  });

  it('includes schema_version', () => {
    db = createTestDatabase();
    const result = handleCheckFreshness(db);
    expect(result.schema_version).toBe('1.0');
  });

  it('includes refresh_command', () => {
    db = createTestDatabase();
    const result = handleCheckFreshness(db);
    expect(result.refresh_command).toContain('ingest.yml');
    expect(result.refresh_command).toContain('ch-livestock-mcp');
  });

  it('includes staleness threshold', () => {
    db = createTestDatabase();
    const result = handleCheckFreshness(db);
    expect(result.staleness_threshold_days).toBe(90);
  });

  it('includes _meta', () => {
    db = createTestDatabase();
    const result = handleCheckFreshness(db);
    expect(result._meta).toBeDefined();
    expect(result._meta.disclaimer).toBeTruthy();
  });

  it('returns unknown for missing ingest date', () => {
    db = createTestDatabase();
    db.run("DELETE FROM db_metadata WHERE key = 'last_ingest'");
    const result = handleCheckFreshness(db);
    expect(result.status).toBe('unknown');
    expect(result.last_ingest).toBeNull();
    expect(result.days_since_ingest).toBeNull();
  });
});
