#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { configureLogger, logger } from './logger.js';
import { loadConfig } from './config/config.js';
import { runCli } from './cli.js';

export async function startApp(): Promise<void> {
  const [
    { Store },
    { EventBus },
    { PermissionService },
    { ControlHub },
    { HubServer },
    { TelegramControl },
  ] = await Promise.all([
    import('./store/store.js'),
    import('./runtime/event-bus.js'),
    import('./runtime/permissions.js'),
    import('./runtime/control-hub.js'),
    import('./hub/server.js'),
    import('./controls/telegram.js'),
  ]);
  const { config, source } = loadConfig();
  configureLogger(config.log);

  const store = new Store(config.storage.dbPath);
  const events = new EventBus(store);
  const permissions = new PermissionService(store, events, config);
  const hub = new ControlHub(config, store, events, permissions);
  const server = new HubServer(hub, config);
  const telegram = new TelegramControl(hub, config);

  logger.info('config loaded', {
    source,
    settingsPath: config.settingsPath,
    dbPath: config.storage.dbPath,
    workspaceRoots: config.workspace.roots.join(','),
  });

  server.start();
  await telegram.start();

  const publicUrl = config.server.publicUrl || `http://${config.server.host}:${config.server.port}`;
  logger.info('cx-tg started', { url: publicUrl });
  console.log(`CX TG Hub: ${publicUrl}`);
  console.log(`Web token: ${config.server.accessToken}`);
  console.log(`Settings: ${config.settingsPath}`);

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('shutdown started');
    await telegram.stop().catch(() => {});
    await server.stop().catch(() => {});
    await hub.shutdown().catch(() => {});
    store.close();
    logger.info('shutdown complete');
    process.exit(0);
  };
  process.once('SIGINT', () => { void shutdown(); });
  process.once('SIGTERM', () => { void shutdown(); });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
