import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createDatabase, type Database } from './db.js';
import { handleAbout } from './tools/about.js';
import { handleListSources } from './tools/list-sources.js';
import { handleCheckFreshness } from './tools/check-freshness.js';
import { handleSearchLivestockGuidance } from './tools/search-livestock-guidance.js';
import { handleGetWelfareStandards } from './tools/get-welfare-standards.js';
import { handleGetStockingDensity } from './tools/get-stocking-density.js';
import { handleGetFeedRequirements } from './tools/get-feed-requirements.js';
import { handleSearchAnimalHealth } from './tools/search-animal-health.js';
import { handleGetHousingRequirements } from './tools/get-housing-requirements.js';
import { handleGetMovementRules } from './tools/get-movement-rules.js';
import { handleGetBreedingGuidance } from './tools/get-breeding-guidance.js';

const SERVER_NAME = 'ch-livestock-mcp';
const SERVER_VERSION = '0.1.0';
const PORT = parseInt(process.env.PORT ?? '3000', 10);

const SearchArgsSchema = z.object({
  query: z.string(),
  species: z.string().optional(),
  jurisdiction: z.string().optional(),
  limit: z.number().optional(),
});

const WelfareArgsSchema = z.object({
  species: z.string(),
  production_system: z.string().optional(),
  jurisdiction: z.string().optional(),
});

const StockingArgsSchema = z.object({
  species: z.string(),
  age_class: z.string().optional(),
  housing_type: z.string().optional(),
  jurisdiction: z.string().optional(),
});

const FeedArgsSchema = z.object({
  species: z.string(),
  age_class: z.string().optional(),
  production_stage: z.string().optional(),
  jurisdiction: z.string().optional(),
});

const HealthSearchArgsSchema = z.object({
  query: z.string(),
  species: z.string().optional(),
  jurisdiction: z.string().optional(),
});

const HousingArgsSchema = z.object({
  species: z.string(),
  age_class: z.string().optional(),
  system: z.string().optional(),
  jurisdiction: z.string().optional(),
});

const MovementArgsSchema = z.object({
  species: z.string(),
  rule_type: z.string().optional(),
  jurisdiction: z.string().optional(),
});

const BreedingArgsSchema = z.object({
  species: z.string(),
  topic: z.string().optional(),
  jurisdiction: z.string().optional(),
});

const TOOLS = [
  {
    name: 'about',
    description: 'Get server metadata: name, version, coverage, data sources, and links.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'list_sources',
    description: 'List all data sources with authority, URL, license, and freshness info.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'check_data_freshness',
    description: 'Check when data was last ingested, staleness status, and how to trigger a refresh.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'search_livestock_guidance',
    description: 'Search across all Swiss livestock topics: welfare, housing, feeding, health, transport, breeds.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Free-text search query (German or English)' },
        species: { type: 'string', description: 'Filter by species (e.g. Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: CH)' },
        limit: { type: 'number', description: 'Max results (default: 20, max: 50)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_welfare_standards',
    description: 'Get legal minimum welfare requirements and RAUS/BTS programme standards for a species.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        species: { type: 'string', description: 'Species: Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde' },
        production_system: { type: 'string', description: 'Production system (e.g. TSchV-Minimum, RAUS, BTS)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: CH)' },
      },
      required: ['species'],
    },
  },
  {
    name: 'get_stocking_density',
    description: 'Get animals per m2 and space requirements by species, age class, and housing type.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        species: { type: 'string', description: 'Species: Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde' },
        age_class: { type: 'string', description: 'Age/weight class (e.g. Milchkuh, Kalb, Mastschwein >60kg)' },
        housing_type: { type: 'string', description: 'Housing type (e.g. Laufstall, Anbindestall, Voliere)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: CH)' },
      },
      required: ['species'],
    },
  },
  {
    name: 'get_feed_requirements',
    description: 'Get nutritional requirements per species and production stage. Includes GMF programme details.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        species: { type: 'string', description: 'Species: Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde' },
        age_class: { type: 'string', description: 'Age class (e.g. Milchkuh, Mastschwein, Legehenne)' },
        production_stage: { type: 'string', description: 'Production stage (e.g. Laktation, Mast, Aufzucht)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: CH)' },
      },
      required: ['species'],
    },
  },
  {
    name: 'search_animal_health',
    description: 'Search animal health topics: diseases, symptoms, prevention, regulatory reporting requirements.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query (e.g. Salmonellen, BVD, Moderhinke)' },
        species: { type: 'string', description: 'Filter by species' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: CH)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_housing_requirements',
    description: 'Get detailed housing specs: space, ventilation, flooring, temperature. TSchV minimum vs. BTS.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        species: { type: 'string', description: 'Species: Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde' },
        age_class: { type: 'string', description: 'Age class (e.g. Milchkuh, Mastschwein, Legehenne)' },
        system: { type: 'string', description: 'Housing system (e.g. Laufstall, Anbindestall, BTS)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: CH)' },
      },
      required: ['species'],
    },
  },
  {
    name: 'get_movement_rules',
    description: 'Get TVD registration, transport rules, standstill, and Soemmerung requirements per species.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        species: { type: 'string', description: 'Species: Rinder, Schweine, Gefluegel, Schafe, Ziegen, Pferde' },
        rule_type: { type: 'string', description: 'Rule type: TVD, Transport, Soemmerung, Schlachtung' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: CH)' },
      },
      required: ['species'],
    },
  },
  {
    name: 'get_breeding_guidance',
    description: 'Get Swiss breed info, breeding calendars, AI (kuenstliche Besamung), genetics, Soemmerung guidance.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        species: { type: 'string', description: 'Species: Rinder, Schweine, Schafe, Ziegen, Pferde' },
        topic: { type: 'string', description: 'Topic filter (e.g. Zweinutzung, Milch, Fleisch, Alp)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: CH)' },
      },
      required: ['species'],
    },
  },
];

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }], isError: true };
}

function registerTools(server: Server, db: Database): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case 'about':
          return textResult(handleAbout());
        case 'list_sources':
          return textResult(handleListSources(db));
        case 'check_data_freshness':
          return textResult(handleCheckFreshness(db));
        case 'search_livestock_guidance':
          return textResult(handleSearchLivestockGuidance(db, SearchArgsSchema.parse(args)));
        case 'get_welfare_standards':
          return textResult(handleGetWelfareStandards(db, WelfareArgsSchema.parse(args)));
        case 'get_stocking_density':
          return textResult(handleGetStockingDensity(db, StockingArgsSchema.parse(args)));
        case 'get_feed_requirements':
          return textResult(handleGetFeedRequirements(db, FeedArgsSchema.parse(args)));
        case 'search_animal_health':
          return textResult(handleSearchAnimalHealth(db, HealthSearchArgsSchema.parse(args)));
        case 'get_housing_requirements':
          return textResult(handleGetHousingRequirements(db, HousingArgsSchema.parse(args)));
        case 'get_movement_rules':
          return textResult(handleGetMovementRules(db, MovementArgsSchema.parse(args)));
        case 'get_breeding_guidance':
          return textResult(handleGetBreedingGuidance(db, BreedingArgsSchema.parse(args)));
        default:
          return errorResult(`Unknown tool: ${name}`);
      }
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }
  });
}

const db = createDatabase();
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: Server }>();

function createMcpServer(): Server {
  const mcpServer = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );
  registerTools(mcpServer, db);
  return mcpServer;
}

async function handleMCPRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res);
    return;
  }

  if (req.method === 'GET' || req.method === 'DELETE') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid or missing session ID' }));
    return;
  }

  const mcpServer = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  await mcpServer.connect(transport);

  transport.onclose = () => {
    if (transport.sessionId) {
      sessions.delete(transport.sessionId);
    }
    mcpServer.close().catch(() => {});
  };

  await transport.handleRequest(req, res);

  if (transport.sessionId) {
    sessions.set(transport.sessionId, { transport, server: mcpServer });
  }
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', server: SERVER_NAME, version: SERVER_VERSION }));
    return;
  }

  if (url.pathname === '/mcp' || url.pathname === '/') {
    try {
      await handleMCPRequest(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }));
      }
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

httpServer.listen(PORT, () => {
  console.log(`${SERVER_NAME} v${SERVER_VERSION} listening on port ${PORT}`);
});
