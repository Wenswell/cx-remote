import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve, type ServerType } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { z } from 'zod';
import { getSettingValue, isPathInside, listSettingFields, maskSettings, setSettingValue, type AppConfig } from '../config/config.js';
import { findSettingField } from '../config/fields.js';
import type { PromptJobStatus } from '../domain/types.js';
import { ControlHub } from '../runtime/control-hub.js';
import { encodeSseFrame } from '../runtime/sse.js';
import { logger } from '../logger.js';

const createSessionSchema = z.object({
  cwd: z.string().min(1),
  title: z.string().optional(),
  bypassApprovalsAndSandbox: z.boolean().optional(),
});

const controlTypeSchema = z.enum(['web', 'telegram', 'cli']);

const sendMessageSchema = z.object({
  text: z.string().min(1),
  controlType: controlTypeSchema.default('web'),
  ownerId: z.string().optional(),
  controlLabel: z.string().optional(),
});

const updateSessionSchema = z.object({
  title: z.string().min(1),
});

const resolveApprovalSchema = z.object({
  decision: z.string().min(1),
  controlType: controlTypeSchema.default('web'),
});

const approvalStatusSchema = z.enum(['pending', 'resolved', 'expired']);
const promptJobStatusSchema = z.enum(['queued', 'running', 'done', 'failed', 'canceled', 'active', 'all']);

const claimControlSchema = z.object({
  controlType: controlTypeSchema,
  ownerId: z.string().min(1),
  controlLabel: z.string().optional(),
  ttlMs: z.number().int().min(10_000).max(24 * 60 * 60 * 1000).optional(),
});

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

const WEB_AUTH_COOKIE = 'cx_tg_auth';

export type HubServerOptions = {
  webDistDir?: string;
};

export class HubServer {
  private server: ServerType | null = null;

  constructor(
    private readonly hub: ControlHub,
    private readonly config: AppConfig,
    private readonly options: HubServerOptions = {},
  ) {}

  start(): void {
    if (this.server) return;
    const app = this.createApp();
    this.server = serve({
      fetch: app.fetch,
      hostname: this.config.server.host,
      port: this.config.server.port,
    });
    logger.info('hub server started', {
      host: this.config.server.host,
      port: this.config.server.port,
    });
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.server?.close(() => resolve());
      if (!this.server) resolve();
    });
    this.server = null;
  }

  createApp(): Hono {
    const app = new Hono();
    const webDistDir = this.options.webDistDir || defaultWebDistDir();
    const serveWebIndex = serveStatic({ root: webDistDir, path: 'index.html' });
    const serveWebAsset = serveStatic({ root: webDistDir });

    app.use('*', cors());
    app.use('*', async (c, next) => {
      const startedAt = Date.now();
      await next();
      logger.info('http request', {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Date.now() - startedAt,
      });
    });
    app.onError((error, c) => {
      const status = errorStatus(error);
      logger.warn('api error', { status, error: error instanceof Error ? error.message : String(error) });
      return c.json({ error: { message: errorMessage(error) } }, status);
    });
    app.notFound((c) => c.json({ error: { message: 'Not found' } }, 404));

    app.use('/api/*', async (c, next) => {
      if (!isAuthorizedRequest(c.req.header('authorization'), c.req.header('cookie'), this.config.server.accessToken)) {
        return c.json({ error: { message: 'Unauthorized' } }, 401);
      }
      await next();
    });

    app.post('/api/auth', (c) => {
      c.header('Set-Cookie', authCookie(this.config.server.accessToken, isSecureCookie(this.config.server.publicUrl)));
      return c.json({ ok: true });
    });
    app.get('/api/health', (c) => c.json({ ok: true, name: 'cx-tg' }));
    app.get('/api/status', (c) => c.json({
      ok: true,
      settingsPath: this.config.settingsPath,
      workspaceRoots: this.config.workspace.roots,
      server: {
        host: this.config.server.host,
        port: this.config.server.port,
        publicUrl: this.config.server.publicUrl,
      },
      controls: {
        telegram: {
          enabled: this.config.controls.telegram.enabled,
          allowedUsers: this.config.controls.telegram.allowedUsers,
          allowedChats: this.config.controls.telegram.allowedChats,
        },
      },
      stats: this.hub.stats(),
    }));

    app.get('/api/workspaces', (c) => c.json(this.config.workspace.roots.map((root, index) => ({
      id: String(index),
      name: basename(root) || root,
      path: root,
    }))));

    app.get('/api/files', (c) => {
      const root = workspaceRoot(this.config.workspace.roots, c.req.query('root'));
      const path = c.req.query('path') || '';
      const current = resolve(root, path);
      if (!isPathInside(root, current)) throw new Error('Path must be inside the selected workspace root');
      if (!existsSync(current)) throw new Error(`Path does not exist: ${current}`);
      if (!statSync(current).isDirectory()) throw new Error(`Path is not a directory: ${current}`);
      const entries = readdirSync(current, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => {
          const absolutePath = join(current, entry.name);
          return {
            name: entry.name,
            path: absolutePath,
            relativePath: relative(root, absolutePath),
          };
        });
      const rel = relative(root, current);
      return c.json({
        root,
        current,
        relativePath: rel,
        parentPath: rel ? relative(root, resolve(current, '..')) : '',
        entries,
      });
    });

    app.get('/api/settings', (c) => c.json({
      settings: maskSettings(this.config),
      fields: listSettingFields().map((field) => ({
        ...field,
        value: field.secret ? undefined : getSettingValue(this.config, field.key),
      })),
    }));

    app.patch('/api/settings', async (c) => {
      const input = updateSettingSchema.parse(await c.req.json());
      const field = findSettingField(input.key);
      const settings = setSettingValue(input.key, input.value);
      return c.json({
        ok: true,
        settings: maskSettings(settings),
        restartRequired: Boolean(field.restartRequired),
      });
    });

    app.get('/api/sessions', (c) => c.json(this.hub.listSessions()));
    app.post('/api/sessions', async (c) => {
      const input = createSessionSchema.parse(await c.req.json());
      const session = this.hub.createSession({
        cwd: input.cwd,
        title: input.title,
        bypassApprovalsAndSandbox: input.bypassApprovalsAndSandbox,
      });
      return c.json(session, 201);
    });

    app.get('/api/sessions/:id', (c) => c.json(this.hub.getSessionDetail(c.req.param('id'))));

    app.patch('/api/sessions/:id', async (c) => {
      const input = updateSessionSchema.parse(await c.req.json());
      return c.json(this.hub.renameSession(c.req.param('id'), input.title));
    });

    app.delete('/api/sessions/:id', async (c) => {
      await this.hub.deleteSession(c.req.param('id'));
      return c.json({ ok: true });
    });

    app.patch('/api/sessions/:id/control', async (c) => {
      const input = claimControlSchema.parse(await c.req.json());
      return c.json(this.hub.claimControl(c.req.param('id'), {
        controlType: input.controlType,
        ownerId: input.ownerId,
        label: input.controlLabel,
        ttlMs: input.ttlMs,
      }));
    });

    app.delete('/api/sessions/:id/control', (c) => {
      return c.json(this.hub.releaseControl(c.req.param('id'), c.req.query('ownerId') || undefined));
    });

    app.get('/api/sessions/:id/messages', (c) => c.json(this.hub.listMessages(c.req.param('id'), {
      limit: parseLimit(c.req.query('limit'), 200),
      afterId: c.req.query('afterId') || undefined,
    })));

    app.get('/api/sessions/:id/queue', (c) => {
      const status = promptJobStatusSchema.parse(c.req.query('status') || 'active');
      return c.json(this.hub.listPromptJobs(c.req.param('id'), {
        statuses: promptJobStatuses(status),
        limit: parseLimit(c.req.query('limit'), 100),
      }));
    });

    app.post('/api/sessions/:id/messages', async (c) => {
      const input = sendMessageSchema.parse(await c.req.json());
      const message = await this.hub.sendMessage(c.req.param('id'), input.text, input.controlType, {
        ownerId: input.ownerId,
        label: input.controlLabel,
      });
      return c.json(message, 202);
    });

    app.post('/api/sessions/:id/interrupt', async (c) => {
      await this.hub.interrupt(c.req.param('id'));
      return c.json({ ok: true });
    });

    app.get('/api/approvals', (c) => {
      const sessionId = c.req.query('sessionId');
      const statusParam = c.req.query('status');
      const status = statusParam && statusParam !== 'all' ? approvalStatusSchema.parse(statusParam) : (statusParam === 'all' ? undefined : 'pending');
      return c.json(this.hub.listApprovals({
        sessionId: sessionId || undefined,
        status,
        limit: parseLimit(c.req.query('limit'), 100),
      }));
    });

    app.post('/api/approvals/:id/resolve', async (c) => {
      const input = resolveApprovalSchema.parse(await c.req.json());
      await this.hub.resolveApproval(c.req.param('id'), input.decision, input.controlType);
      return c.json({ ok: true });
    });

    app.get('/api/bindings', (c) => c.json(this.hub.listBindings()));
    app.get('/api/events', (c) => {
      const sessionId = c.req.query('sessionId') || undefined;
      const afterId = parseEventId(c.req.header('last-event-id') || c.req.query('afterId'));
      const stream = new ReadableStream({
        start: (controller) => {
          const encoder = new TextEncoder();
          const send = (data: unknown) => controller.enqueue(encoder.encode(encodeSseFrame(data)));
          for (const event of this.hub.listEvents(afterId, sessionId)) {
            send(event);
          }
          send({ type: 'ready', createdAt: Date.now() });
          const unsubscribe = this.hub.events.subscribe((event) => {
            if (sessionId && event.sessionId !== sessionId) return;
            send(event);
          });
          const interval = setInterval(() => {
            controller.enqueue(encoder.encode(': ping\n\n'));
          }, 20_000);
          c.req.raw.signal.addEventListener('abort', () => {
            clearInterval(interval);
            unsubscribe();
            controller.close();
          }, { once: true });
        },
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    });

    app.get('/', serveWebIndex);
    app.get('/assets/*', serveWebAsset);
    app.get('*', async (c, next) => {
      if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/assets/') || c.req.method !== 'GET' || !acceptsHtml(c.req.header('accept'))) {
        await next();
        return;
      }
      return serveWebIndex(c, next);
    });

    return app;
  }
}

function defaultWebDistDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/web');
}

function acceptsHtml(accept: string | undefined): boolean {
  return Boolean(accept?.includes('text/html'));
}

function isAuthorizedRequest(authorization: string | undefined, cookie: string | undefined, token: string): boolean {
  return authorization === `Bearer ${token}` || authCookieValue(cookie) === token;
}

function authCookieValue(header: string | undefined): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === WEB_AUTH_COOKIE) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

function authCookie(token: string, secure: boolean): string {
  return [
    `${WEB_AUTH_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

function isSecureCookie(publicUrl: string): boolean {
  return publicUrl.startsWith('https://');
}

function parseLimit(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error('limit must be a number');
  return parsed;
}

function parseEventId(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) throw new Error('afterId must be a non-negative integer');
  return parsed;
}

function promptJobStatuses(value: z.infer<typeof promptJobStatusSchema>): PromptJobStatus[] | undefined {
  if (value === 'all') return undefined;
  if (value === 'active') return ['running', 'queued'];
  return [value];
}

function errorStatus(error: unknown): 400 | 404 | 409 | 500 {
  if (error instanceof z.ZodError) return 400;
  const message = errorMessage(error).toLowerCase();
  if (message.includes('not found')) return 404;
  if (message.includes('already running') || message.includes('controlled by')) return 409;
  if (error instanceof Error) return 400;
  return 500;
}

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return z.prettifyError(error);
  return error instanceof Error ? error.message : String(error);
}

function workspaceRoot(roots: string[], input: string | undefined): string {
  if (!input) return roots[0]!;
  const root = roots.find((item) => item === input || item === resolve(input));
  if (!root) throw new Error('Unknown workspace root');
  return root;
}
