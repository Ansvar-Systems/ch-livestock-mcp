import { describe, it, expect } from 'vitest';
import { validateJurisdiction, SUPPORTED_JURISDICTIONS } from '../src/jurisdiction.js';

describe('validateJurisdiction', () => {
  it('accepts CH', () => {
    const result = validateJurisdiction('CH');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.jurisdiction).toBe('CH');
    }
  });

  it('accepts lowercase ch', () => {
    const result = validateJurisdiction('ch');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.jurisdiction).toBe('CH');
    }
  });

  it('defaults to CH when undefined', () => {
    const result = validateJurisdiction(undefined);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.jurisdiction).toBe('CH');
    }
  });

  it('rejects unsupported jurisdiction', () => {
    const result = validateJurisdiction('DE');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.error).toBe('jurisdiction_not_supported');
      expect(result.error.supported).toEqual(SUPPORTED_JURISDICTIONS);
    }
  });

  it('exports SUPPORTED_JURISDICTIONS with CH', () => {
    expect(SUPPORTED_JURISDICTIONS).toContain('CH');
  });
});
