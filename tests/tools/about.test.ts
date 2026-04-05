import { describe, it, expect } from 'vitest';
import { handleAbout } from '../../src/tools/about.js';

describe('about tool', () => {
  it('returns server metadata', () => {
    const result = handleAbout();
    expect(result.name).toBe('Switzerland Livestock MCP');
    expect(result.version).toBe('0.1.0');
    expect(result.jurisdiction).toContain('CH');
    expect(result.tools_count).toBe(11);
  });

  it('includes data_sources', () => {
    const result = handleAbout();
    expect(result.data_sources.length).toBeGreaterThan(0);
    expect(result.data_sources.some((s: string) => s.includes('TSchV'))).toBe(true);
  });

  it('includes links', () => {
    const result = handleAbout();
    expect(result.links.homepage).toContain('ansvar.eu');
    expect(result.links.repository).toContain('ch-livestock-mcp');
    expect(result.links.mcp_network).toContain('ansvar.ai');
  });

  it('includes _meta with disclaimer', () => {
    const result = handleAbout();
    expect(result._meta).toBeDefined();
    expect(result._meta.disclaimer).toBeTruthy();
    expect(result._meta.server).toBe('ch-livestock-mcp');
  });
});
