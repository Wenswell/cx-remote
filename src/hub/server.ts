import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { serve, type ServerType } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { z } from 'zod';
import { ClusterService, LOCAL_NODE_ID, type NodeStatusView } from '../cluster/service.js';
import { resolveCodexRuntimeDefaults } from '../agents/codex/defaults.js';
import { getSettingValue, isPathInside, listSettingFields, maskSettings, resolveWorkspacePath, serverBasePath, setSettingValue, type AppConfig } from '../config/config.js';
import { findSettingField } from '../config/fields.js';
import { CODEX_MODEL_OPTIONS, CODEX_REASONING_EFFORT_OPTIONS } from '../domain/types.js';
import type { PromptJobStatus } from '../domain/types.js';
import { ControlHub } from '../runtime/control-hub.js';
import { encodeSseFrame } from '../runtime/sse.js';
import { logger } from '../logger.js';

const permissionModeSchema = z.enum(['default', 'read-only', 'safe-yolo', 'yolo']);
const codexModelSchema = z.enum(['auto', ...CODEX_MODEL_OPTIONS]);
const codexReasoningEffortSchema = z.enum(['default', ...CODEX_REASONING_EFFORT_OPTIONS]);

const createSessionSchema = z.object({
  nodeId: z.string().optional(),
  cwd: z.string().min(1),
  title: z.string().optional(),
  config: sessionConfigSchema().optional(),
});

const adoptSessionSchema = z.object({
  nodeId: z.string().optional(),
  threadId: z.string().min(1),
  cwd: z.string().min(1),
  title: z.string().optional(),
  config: sessionConfigSchema().optional(),
  importTranscript: z.boolean().optional().default(false),
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

const updateSessionConfigSchema = z.object({
  config: sessionConfigSchema(),
});

const codexSessionsQuerySchema = z.object({
  nodeId: z.string().optional(),
  cwd: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const sessionsQuerySchema = z.object({
  nodeId: z.string().optional(),
  cwd: z.string().min(1).optional(),
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

const WEB_AUTH_COOKIE = 'cx_remote_auth';

function sessionConfigSchema() {
  return z.object({
    model: codexModelSchema.optional(),
    reasoningEffort: codexReasoningEffortSchema.optional(),
    permissionMode: permissionModeSchema.optional(),
    search: z.boolean().optional(),
  });
}

export type HubServerOptions = {
  webDistDir?: string;
  codexHome?: string;
  fetchImpl?: typeof fetch;
};

export class HubServer {
  private server: ServerType | null = null;
  private readonly cluster: ClusterService;

  constructor(
    private readonly hub: ControlHub,
    private readonly config: AppConfig,
    private readonly options: HubServerOptions = {},
  ) {
    this.cluster = new ClusterService(
      this.hub,
      this.hub.events,
      this.config,
      this.options.codexHome,
      this.options.fetchImpl,
    );
  }

  async start(): Promise<void> {
    if (this.server) return;
    await this.cluster.start();
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
    await this.cluster.stop();
  }

  createApp(): Hono {
    const app = new Hono();
    const webDistDir = this.options.webDistDir || defaultWebDistDir();
    const basePath = serverBasePath(this.config.server.publicUrl);
    const webIndex = renderWebIndex(webDistDir, basePath);
    const serveWebIndex = (c: Context) => c.html(webIndex);
    const serveWebAsset = serveStatic({
      root: webDistDir,
      rewriteRequestPath: (path) => stripBasePath(path, basePath),
    });
    const route = (path: string) => routePath(basePath, path);

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

    app.use(route('/api/*'), async (c, next) => {
      if (!isAuthorizedRequest(c.req.header('authorization'), c.req.header('cookie'), this.config.server.accessToken)) {
        return c.json({ error: { message: 'Unauthorized' } }, 401);
      }
      await next();
    });

    app.post(route('/api/auth'), (c) => {
      c.header('Set-Cookie', authCookie(this.config.server.accessToken, isSecureCookie(this.config.server.publicUrl), basePath));
      return c.json({ ok: true });
    });
    app.get(route('/api/health'), (c) => c.json({ ok: true, name: 'cx-remote' }));
    app.get(route('/api/status'), async (c) => {
      const localOnly = isLocalScope(c.req.query('scope'));
      const nodes = await this.cluster.listNodes(localOnly);
      return c.json({
        ok: true,
        node: {
          id: LOCAL_NODE_ID,
          name: this.config.cluster.name,
          local: true,
        },
        nodes,
        settingsPath: this.config.settingsPath,
        homePath: homedir(),
        workspaceRoots: nodes.flatMap((node) => node.workspaceRoots),
        codexDefaults: this.hub.defaultSessionConfig(),
        codexRuntimeDefaults: resolveCodexRuntimeDefaults(),
        eventCursor: this.hub.latestEventId(),
        server: {
          host: this.config.server.host,
          port: this.config.server.port,
          publicUrl: this.config.server.publicUrl,
          basePath,
        },
        controls: {
          telegram: {
            enabled: this.config.controls.telegram.enabled,
            allowedUsers: this.config.controls.telegram.allowedUsers,
            allowedChats: this.config.controls.telegram.allowedChats,
          },
        },
        stats: aggregateNodeStats(nodes),
      });
    });

    app.get(route('/api/workspaces'), async (c) => {
      return c.json(await this.cluster.listWorkspaces(isLocalScope(c.req.query('scope'))));
    });

    app.get(route('/api/files'), async (c) => {
      const workspaceId = c.req.query('workspaceId');
      const path = c.req.query('path') || '';
      if (workspaceId) return c.json(await this.cluster.listFiles(workspaceId, path));

      const root = workspaceRoot(this.config.workspace.roots, c.req.query('root'));
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
        workspaceId: `legacy:${root}`,
        nodeId: LOCAL_NODE_ID,
        nodeName: this.config.cluster.name,
        homePath: homedir(),
        root,
        current,
        relativePath: rel,
        parentPath: rel ? relative(root, resolve(current, '..')) : '',
        entries,
      });
    });

    app.get(route('/api/codex/sessions'), async (c) => {
      const input = codexSessionsQuerySchema.parse({
        nodeId: c.req.query('nodeId'),
        cwd: c.req.query('cwd'),
        limit: c.req.query('limit'),
      });
      return c.json(await this.cluster.listCodexSessions({
        nodeId: input.nodeId,
        cwd: input.cwd,
        limit: input.limit,
        localOnly: isLocalScope(c.req.query('scope')) || !input.nodeId,
      }));
    });

    app.get(route('/api/codex/sessions/:threadId/preview'), async (c) => {
      const threadId = z.string().min(1).parse(c.req.param('threadId'));
      return c.json(await this.cluster.previewCodexSession({
        threadId,
        nodeId: c.req.query('nodeId') || undefined,
        localOnly: isLocalScope(c.req.query('scope')) || !c.req.query('nodeId'),
      }));
    });

    app.get(route('/api/settings'), (c) => c.json({
      settings: maskSettings(this.config),
      fields: listSettingFields().map((field) => ({
        ...field,
        value: field.secret ? undefined : getSettingValue(this.config, field.key),
      })),
    }));

    app.patch(route('/api/settings'), async (c) => {
      const input = updateSettingSchema.parse(await c.req.json());
      const field = findSettingField(input.key);
      const settings = setSettingValue(input.key, input.value);
      return c.json({
        ok: true,
        settings: maskSettings(settings),
        restartRequired: Boolean(field.restartRequired),
      });
    });

    app.get(route('/api/sessions'), async (c) => {
      const input = sessionsQuerySchema.parse({
        nodeId: c.req.query('nodeId'),
        cwd: c.req.query('cwd'),
      });
      return c.json(await this.cluster.listSessions({
        nodeId: input.nodeId,
        cwd: input.cwd,
        localOnly: isLocalScope(c.req.query('scope')) || Boolean(input.cwd && !input.nodeId),
      }));
    });
    app.post(route('/api/sessions'), async (c) => {
      const input = createSessionSchema.parse(await c.req.json());
      const session = await this.cluster.createSession({
        nodeId: input.nodeId,
        cwd: input.cwd,
        title: input.title,
        config: input.config,
      });
      return c.json(session, 201);
    });

    app.post(route('/api/sessions/adopt'), async (c) => {
      const input = adoptSessionSchema.parse(await c.req.json());
      const session = await this.cluster.adoptSession({
        nodeId: input.nodeId,
        threadId: input.threadId,
        cwd: input.cwd,
        title: input.title,
        config: input.config,
        importTranscript: input.importTranscript,
      });
      return c.json(session, 201);
    });

    app.get(route('/api/sessions/:id'), async (c) => c.json(await this.cluster.getSessionDetail(routeParam(c, 'id'))));

    app.patch(route('/api/sessions/:id'), async (c) => {
      const input = updateSessionSchema.parse(await c.req.json());
      return c.json(await this.cluster.renameSession(routeParam(c, 'id'), input.title));
    });

    app.patch(route('/api/sessions/:id/config'), async (c) => {
      const input = updateSessionConfigSchema.parse(await c.req.json());
      return c.json(await this.cluster.updateSessionConfig(routeParam(c, 'id'), input.config));
    });

    app.delete(route('/api/sessions/:id'), async (c) => {
      await this.cluster.deleteSession(routeParam(c, 'id'));
      return c.json({ ok: true });
    });

    app.patch(route('/api/sessions/:id/control'), async (c) => {
      const input = claimControlSchema.parse(await c.req.json());
      return c.json(await this.cluster.claimControl(routeParam(c, 'id'), {
        controlType: input.controlType,
        ownerId: input.ownerId,
        controlLabel: input.controlLabel,
        ttlMs: input.ttlMs,
      }));
    });

    app.delete(route('/api/sessions/:id/control'), async (c) => {
      return c.json(await this.cluster.releaseControl(routeParam(c, 'id'), c.req.query('ownerId') || undefined));
    });

    app.get(route('/api/sessions/:id/messages'), async (c) => c.json(await this.cluster.listMessages(routeParam(c, 'id'), {
      limit: parseLimit(c.req.query('limit'), 200),
      afterId: c.req.query('afterId') || undefined,
    })));

    app.get(route('/api/sessions/:id/queue'), async (c) => {
      const status = promptJobStatusSchema.parse(c.req.query('status') || 'active');
      return c.json(await this.cluster.listPromptJobs(routeParam(c, 'id'), {
        statuses: promptJobStatuses(status),
        limit: parseLimit(c.req.query('limit'), 100),
      }));
    });

    app.post(route('/api/sessions/:id/messages'), async (c) => {
      const input = sendMessageSchema.parse(await c.req.json());
      const message = await this.cluster.sendMessage(routeParam(c, 'id'), {
        text: input.text,
        controlType: input.controlType,
        ownerId: input.ownerId,
        controlLabel: input.controlLabel,
      });
      return c.json(message, 202);
    });

    app.post(route('/api/sessions/:id/interrupt'), async (c) => {
      await this.cluster.interrupt(routeParam(c, 'id'));
      return c.json({ ok: true });
    });

    app.get(route('/api/approvals'), async (c) => {
      const sessionId = c.req.query('sessionId');
      const statusParam = c.req.query('status');
      const status = statusParam && statusParam !== 'all' ? approvalStatusSchema.parse(statusParam) : (statusParam === 'all' ? undefined : 'pending');
      return c.json(await this.cluster.listApprovals({
        sessionId: sessionId || undefined,
        status,
        limit: parseLimit(c.req.query('limit'), 100),
        localOnly: isLocalScope(c.req.query('scope')),
      }));
    });

    app.post(route('/api/approvals/:id/resolve'), async (c) => {
      const input = resolveApprovalSchema.parse(await c.req.json());
      await this.cluster.resolveApproval(routeParam(c, 'id'), input.decision, input.controlType);
      return c.json({ ok: true });
    });

    app.get(route('/api/bindings'), (c) => c.json(this.hub.listBindings()));
    app.get(route('/api/events'), (c) => {
      const sessionId = c.req.query('sessionId') || undefined;
      const localOnly = isLocalScope(c.req.query('scope'));
      const afterId = parseEventId(c.req.header('last-event-id') || c.req.query('afterId'));
      const stream = new ReadableStream({
        start: (controller) => {
          const encoder = new TextEncoder();
          const send = (data: unknown) => controller.enqueue(encoder.encode(encodeSseFrame(data)));
          for (const event of this.hub.listEvents(afterId, sessionId)) {
            if (localOnly && isRelayedEvent(event)) continue;
            send(event);
          }
          send({ type: 'ready', createdAt: Date.now() });
          const unsubscribe = this.hub.events.subscribe((event) => {
            if (sessionId && event.sessionId !== sessionId) return;
            if (localOnly && isRelayedEvent(event)) return;
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

    if (basePath) {
      app.get(basePath, (c) => c.redirect(`${basePath}/${requestQuery(c.req.url)}`));
    }
    app.use(route('/assets/*'), webAuthMiddleware(this.config.server.accessToken, this.config.server.publicUrl, basePath));
    app.use(basePath ? route('/*') : '*', async (c, next) => {
      const path = stripBasePath(c.req.path, basePath);
      if (!isWebPageRequest(path, c.req.method, c.req.header('accept'))) {
        await next();
        return;
      }
      const result = webAuthResult(c, this.config.server.accessToken, this.config.server.publicUrl, basePath);
      if (result) return result;
      await next();
    });
    app.get(route('/'), serveWebIndex);
    app.get(route('/assets/*'), serveWebAsset);
    app.get(basePath ? route('/*') : '*', async (c, next) => {
      const path = stripBasePath(c.req.path, basePath);
      if (path.startsWith('/api/') || path.startsWith('/assets/') || c.req.method !== 'GET' || !acceptsHtml(c.req.header('accept'))) {
        await next();
        return;
      }
      return serveWebIndex(c);
    });

    return app;
  }
}

function defaultWebDistDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/web');
}

function renderWebIndex(webDistDir: string, basePath: string): string {
  const html = readFileSync(join(webDistDir, 'index.html'), 'utf8');
  const assetPrefix = basePath || '';
  const normalizedHtml = html
    .replaceAll('href="/assets/', `href="${assetPrefix}/assets/`)
    .replaceAll('src="/assets/', `src="${assetPrefix}/assets/`);
  const bootstrap = [
    `<base href="${escapeHtmlAttribute(basePath ? `${basePath}/` : '/')}">`,
    `<script>window.__CX_REMOTE_BASE_PATH__=${JSON.stringify(basePath)};</script>`,
  ].join('\n  ');
  return normalizedHtml.includes('</head>')
    ? normalizedHtml.replace('</head>', `  ${bootstrap}\n</head>`)
    : `${bootstrap}\n${normalizedHtml}`;
}

function webAuthMiddleware(token: string, publicUrl: string, basePath: string) {
  return async (c: Context, next: () => Promise<void>) => {
    const result = webAuthResult(c, token, publicUrl, basePath);
    if (result) return result;
    await next();
  };
}

function webAuthResult(c: Context, token: string, publicUrl: string, basePath: string): Response | undefined {
  const url = new URL(c.req.url);
  const tokenParam = url.searchParams.get('token');
  if (tokenParam !== null) {
    if (tokenParam !== token) return new Response('Unauthorized', { status: 401 });
    url.searchParams.delete('token');
    const redirectTo = `${url.pathname}${url.search}`;
    const response = c.redirect(redirectTo || `${basePath || '/'}`);
    response.headers.set('Set-Cookie', authCookie(token, isSecureCookie(publicUrl), basePath));
    return response;
  }
  if (!isAuthorizedRequest(c.req.header('authorization'), c.req.header('cookie'), token)) {
    return new Response('Unauthorized', { status: 401 });
  }
  return undefined;
}

function routePath(basePath: string, path: string): string {
  if (!basePath) return path;
  if (path === '/') return `${basePath}/`;
  return `${basePath}${path}`;
}

function requestQuery(rawUrl: string): string {
  const query = new URL(rawUrl).search;
  return query || '';
}

function stripBasePath(path: string, basePath: string): string {
  if (!basePath) return path;
  if (path === basePath) return '/';
  return path.startsWith(`${basePath}/`) ? path.slice(basePath.length) : path;
}

function escapeHtmlAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function routeParam(c: Context, name: string): string {
  return z.string().min(1).parse(c.req.param(name));
}

function acceptsHtml(accept: string | undefined): boolean {
  return Boolean(accept?.includes('text/html'));
}

function isWebPageRequest(path: string, method: string, accept: string | undefined): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false;
  if (path.startsWith('/api/') || path.startsWith('/assets/')) return false;
  return path === '/' || acceptsHtml(accept);
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

function authCookie(token: string, secure: boolean, basePath: string): string {
  return [
    `${WEB_AUTH_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    `Path=${basePath || '/'}`,
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
  if (message.includes('already running') || message.includes('controlled by') || message.includes('already managed')) return 409;
  if (error instanceof Error) return 400;
  return 500;
}

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return z.prettifyError(error);
  return error instanceof Error ? error.message : String(error);
}

function workspaceRoot(roots: string[], input: string | undefined): string {
  if (roots.length === 0) throw new Error('workspace.roots is empty on this Hub node');
  if (!input) return roots[0]!;
  const root = roots.find((item) => item === input || item === resolve(input));
  if (!root) throw new Error('Unknown workspace root');
  return root;
}

function aggregateNodeStats(nodes: NodeStatusView[]): { sessions: number; pendingApprovals: number; queuedPrompts: number } {
  return nodes.reduce((stats, node) => {
    if (!node.stats) return stats;
    stats.sessions += node.stats.sessions;
    stats.pendingApprovals += node.stats.pendingApprovals;
    stats.queuedPrompts += node.stats.queuedPrompts;
    return stats;
  }, {
    sessions: 0,
    pendingApprovals: 0,
    queuedPrompts: 0,
  });
}

function isLocalScope(value: string | undefined): boolean {
  return value === 'local';
}

function isRelayedEvent(event: { payload?: Record<string, unknown> }): boolean {
  return typeof event.payload?.nodeId === 'string' && event.payload.nodeId !== LOCAL_NODE_ID;
}
