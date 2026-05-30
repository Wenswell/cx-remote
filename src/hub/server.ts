import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve, type ServerType } from '@hono/node-server';
import { z } from 'zod';
import { getSettingValue, listSettingFields, maskSettings, setSettingValue, type AppConfig } from '../config/config.js';
import { findSettingField } from '../config/fields.js';
import { ControlHub } from '../runtime/control-hub.js';
import { webPage } from '../web/page.js';
import { logger } from '../logger.js';

const createSessionSchema = z.object({
  cwd: z.string().min(1),
  title: z.string().optional(),
  bypassApprovalsAndSandbox: z.boolean().optional(),
});

const sendMessageSchema = z.object({
  text: z.string().min(1),
});

const resolveApprovalSchema = z.object({
  decision: z.string().min(1),
});

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export class HubServer {
  private server: ServerType | null = null;

  constructor(
    private readonly hub: ControlHub,
    private readonly config: AppConfig,
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
    app.use('*', cors());

    app.use('/api/*', async (c, next) => {
      if (c.req.path === '/api/events' && c.req.query('token') === this.config.server.accessToken) {
        await next();
        return;
      }
      if (!isAuthorized(c.req.header('authorization'), this.config.server.accessToken)) {
        return c.text('Unauthorized', 401);
      }
      await next();
    });

    app.get('/', (c) => c.html(webPage()));
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

    app.get('/api/sessions/:id', (c) => {
      const session = this.hub.getSession(c.req.param('id'));
      return c.json({
        session,
        messages: this.hub.listMessages(session.id),
        approvals: this.hub.store.listPendingApprovals(session.id),
      });
    });

    app.post('/api/sessions/:id/messages', async (c) => {
      const input = sendMessageSchema.parse(await c.req.json());
      const message = await this.hub.sendMessage(c.req.param('id'), input.text, 'web');
      return c.json(message, 202);
    });

    app.post('/api/sessions/:id/interrupt', async (c) => {
      await this.hub.interrupt(c.req.param('id'));
      return c.json({ ok: true });
    });

    app.get('/api/approvals', (c) => {
      const sessionId = c.req.query('sessionId');
      return c.json(this.hub.store.listPendingApprovals(sessionId));
    });

    app.post('/api/approvals/:id/resolve', async (c) => {
      const input = resolveApprovalSchema.parse(await c.req.json());
      await this.hub.resolveApproval(c.req.param('id'), input.decision, 'web');
      return c.json({ ok: true });
    });

    app.get('/api/bindings', (c) => c.json(this.hub.listBindings()));
    app.get('/api/events', (c) => {
      const token = c.req.query('token');
      if (token !== this.config.server.accessToken) return c.text('Unauthorized', 401);
      const sessionId = c.req.query('sessionId') || undefined;
      const stream = new ReadableStream({
        start: (controller) => {
          const encoder = new TextEncoder();
          const send = (data: unknown) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };
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

    return app;
  }
}

function isAuthorized(header: string | undefined, token: string): boolean {
  if (!header) return false;
  return header === `Bearer ${token}`;
}
