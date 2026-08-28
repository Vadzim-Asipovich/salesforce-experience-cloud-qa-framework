import http from 'node:http';
import { randomUUID } from 'node:crypto';

/**
 * A minimal, dependency-free stand-in for the Salesforce REST API.
 *
 * Why a mock instead of a real sandbox? A take-home / portfolio framework
 * has no Salesforce org to point at, and CI must run green for a stranger
 * with zero setup and zero secrets. This server speaks the same shapes the
 * real API does — OAuth2 JWT bearer token exchange, `/services/data/vXX.X`
 * sobject CRUD, and Salesforce's `[{ message, errorCode, fields }]` error
 * envelope — so `SalesforceRestClient` and its zod schemas exercise the
 * exact contract they'd exercise against production, and swapping
 * `USE_MOCK_SF_API=false` in `.env` is the only change needed to point the
 * same test suite at a real org.
 *
 * This is intentionally NOT Express/Fastify: the surface area is small
 * enough that a hand-rolled router keeps the dependency tree honest.
 */

type SObjectRecord = Record<string, unknown> & { Id: string };

interface MockState {
  accounts: Map<string, SObjectRecord>;
  ideas: Map<string, SObjectRecord>;
  issuedTokens: Set<string>;
}

function seedState(): MockState {
  const ideas = new Map<string, SObjectRecord>();
  const seedIdea: SObjectRecord = {
    Id: 'a0B8W00000GdiWiUAJ',
    Name: "Dependent page layouts - data rules to show, hide, or make fields/sections req'd",
    Status__c: 'Delivered',
    Points__c: 125570,
    CategoryPath__c: 'Platform / Customization & App Building',
    CreatedDate: '2006-11-16T00:00:00.000+0000',
  };
  ideas.set(seedIdea.Id, seedIdea);

  return { accounts: new Map(), ideas, issuedTokens: new Set() };
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

/** Salesforce's real error envelope shape: an array of `{message, errorCode}`. */
function sendSfError(
  res: http.ServerResponse,
  status: number,
  errorCode: string,
  message: string,
  fields: string[] = [],
): void {
  sendJson(res, status, [{ message, errorCode, fields }]);
}

async function readJsonBody<T>(req: http.IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {} as T;
  return JSON.parse(raw) as T;
}

function requireBearerAuth(req: http.IncomingMessage, state: MockState): boolean {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  return token.length > 0 && state.issuedTokens.has(token);
}

export function createMockServer(): http.Server {
  const state = seedState();

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const { pathname } = url;
      const method = req.method ?? 'GET';

      // ── OAuth2 JWT Bearer token exchange ────────────────────────────
      if (pathname === '/services/oauth2/token' && method === 'POST') {
        // Real Salesforce validates a signed JWT assertion here. The mock
        // trusts any well-formed request — the point is to exercise the
        // client's token-exchange + storage code path deterministically.
        const token = `mock-access-token-${randomUUID()}`;
        state.issuedTokens.add(token);
        sendJson(res, 200, {
          access_token: token,
          instance_url: `http://127.0.0.1:${url.port || req.socket.localPort}`,
          token_type: 'Bearer',
          issued_at: String(Date.now()),
          signature: 'mock-signature',
        });
        return;
      }

      // Every /services/data/* route requires a bearer token, exactly
      // like the real API's INVALID_SESSION_ID behaviour.
      if (pathname.startsWith('/services/data/') && !requireBearerAuth(req, state)) {
        sendSfError(res, 401, 'INVALID_SESSION_ID', 'Session expired or invalid');
        return;
      }

      // ── sobjects/Account ────────────────────────────────────────────
      const accountMatch = pathname.match(
        /^\/services\/data\/v[\d.]+\/sobjects\/Account\/?([\w-]*)$/,
      );
      if (accountMatch) {
        const id = accountMatch[1];

        if (method === 'POST' && !id) {
          const body = await readJsonBody<Record<string, unknown>>(req);
          if (!body.Name || typeof body.Name !== 'string') {
            sendSfError(res, 400, 'REQUIRED_FIELD_MISSING', 'Required fields are missing: [Name]', [
              'Name',
            ]);
            return;
          }
          const newId = `001${randomUUID().replace(/-/g, '').slice(0, 15).toUpperCase()}`;
          const record: SObjectRecord = { Id: newId, ...body };
          state.accounts.set(newId, record);
          sendJson(res, 201, { id: newId, success: true, errors: [] });
          return;
        }

        if (method === 'GET' && id) {
          const record = state.accounts.get(id);
          if (!record) {
            sendSfError(
              res,
              404,
              'NOT_FOUND',
              `Provided external ID field does not exist or is not accessible: ${id}`,
            );
            return;
          }
          sendJson(res, 200, record);
          return;
        }

        if (method === 'PATCH' && id) {
          const record = state.accounts.get(id);
          if (!record) {
            sendSfError(res, 404, 'NOT_FOUND', `No such record: ${id}`);
            return;
          }
          const body = await readJsonBody<Record<string, unknown>>(req);
          state.accounts.set(id, { ...record, ...body, Id: id });
          res.writeHead(204).end();
          return;
        }

        if (method === 'DELETE' && id) {
          if (!state.accounts.has(id)) {
            sendSfError(res, 404, 'NOT_FOUND', `No such record: ${id}`);
            return;
          }
          state.accounts.delete(id);
          res.writeHead(204).end();
          return;
        }
      }

      // ── sobjects/Idea (read-only, mirrors ideas.salesforce.com data) ─
      const ideaMatch = pathname.match(/^\/services\/data\/v[\d.]+\/sobjects\/Idea\/?([\w-]*)$/);
      if (ideaMatch && method === 'GET') {
        const id = ideaMatch[1] ?? '';
        const record = state.ideas.get(id);
        if (!record) {
          sendSfError(
            res,
            404,
            'NOT_FOUND',
            `Provided external ID field does not exist or is not accessible: ${id}`,
          );
          return;
        }
        sendJson(res, 200, record);
        return;
      }

      sendSfError(res, 404, 'NOT_FOUND', `Unrecognized endpoint: ${method} ${pathname}`);
    } catch (err) {
      sendSfError(
        res,
        500,
        'INTERNAL_SERVER_ERROR',
        err instanceof Error ? err.message : String(err),
      );
    }
  });
}

export function startMockServer(port: number): Promise<http.Server> {
  const server = createMockServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

export function stopMockServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}
