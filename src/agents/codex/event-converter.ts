import type { CodexEvent } from '../../domain/types.js';
import { asNumber, asRecord, asString } from '../../utils.js';

function itemId(params: Record<string, unknown>): string | undefined {
  const direct = asString(params.itemId ?? params.item_id ?? params.id);
  if (direct) return direct;
  const item = asRecord(params.item);
  return item ? asString(item.id ?? item.itemId ?? item.item_id) : undefined;
}

function item(params: Record<string, unknown>): Record<string, unknown> | null {
  return asRecord(params.item) ?? params;
}

function itemType(value: unknown): string | undefined {
  return asString(value)?.toLowerCase().replace(/[\s_-]/g, '');
}

function command(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter((part): part is string => typeof part === 'string').join(' ');
  return undefined;
}

export class CodexEventConverter {
  private commandMeta = new Map<string, Record<string, unknown>>();

  convert(method: string, params: unknown): CodexEvent[] {
    const p = asRecord(params) ?? {};

    if (method.startsWith('codex/event/')) {
      return this.convertWrapped(p);
    }

    if (method === 'thread/started' || method === 'thread/resumed') {
      const thread = asRecord(p.thread) ?? p;
      const threadId = asString(thread.threadId ?? thread.thread_id ?? thread.id);
      return threadId ? [{ type: 'thread_started', thread_id: threadId }] : [];
    }

    if (method === 'turn/started') {
      const turn = asRecord(p.turn) ?? p;
      return [{ type: 'task_started', turn_id: asString(turn.turnId ?? turn.turn_id ?? turn.id) }];
    }

    if (method === 'turn/completed') {
      const turn = asRecord(p.turn) ?? p;
      const turnId = asString(turn.turnId ?? turn.turn_id ?? turn.id);
      const status = asString(p.status ?? turn.status)?.toLowerCase();
      if (status === 'interrupted' || status === 'cancelled' || status === 'canceled') {
        return [{ type: 'turn_aborted', turn_id: turnId }];
      }
      if (status === 'failed' || status === 'error') {
        return [{ type: 'task_failed', turn_id: turnId, error: asString(p.error ?? p.message ?? p.reason) }];
      }
      return [{ type: 'task_complete', turn_id: turnId }];
    }

    if (method === 'item/agentMessage/delta') {
      const delta = asString(p.delta ?? p.text ?? p.message);
      return delta ? [{ type: 'agent_message_delta', delta }] : [];
    }

    if (method === 'item/reasoning/textDelta' || method === 'item/reasoning/summaryTextDelta') {
      const delta = asString(p.delta ?? p.text ?? p.message);
      return delta ? [{ type: 'agent_reasoning_delta', delta }] : [];
    }

    if (method === 'item/started' || method === 'item/completed') {
      return this.convertItem(method, p);
    }

    if (method === 'error') {
      const message = asString(p.message) ?? asString(asRecord(p.error)?.message);
      return message ? [{ type: 'task_failed', error: message }] : [];
    }

    return [];
  }

  private convertWrapped(params: Record<string, unknown>): CodexEvent[] {
    const msg = asRecord(params.msg);
    if (!msg) return [];
    const type = asString(msg.type);
    if (!type) return [];

    if (type === 'agent_message_delta' || type === 'agent_message_content_delta') {
      const delta = asString(msg.delta ?? msg.text ?? msg.message);
      return delta ? [{ type: 'agent_message_delta', delta }] : [];
    }

    if (type === 'agent_message') {
      const text = asString(msg.message ?? msg.text);
      return text ? [{ type: 'agent_message', message: text }] : [];
    }

    if (type === 'reasoning_content_delta') {
      const delta = asString(msg.delta ?? msg.text ?? msg.message);
      return delta ? [{ type: 'agent_reasoning_delta', delta }] : [];
    }

    if (type === 'task_started') return [{ type: 'task_started', turn_id: asString(msg.turn_id ?? msg.turnId) }];
    if (type === 'task_complete') return [{ type: 'task_complete', turn_id: asString(msg.turn_id ?? msg.turnId) }];
    if (type === 'turn_aborted') return [{ type: 'turn_aborted', turn_id: asString(msg.turn_id ?? msg.turnId) }];
    if (type === 'task_failed') return [{ type: 'task_failed', error: asString(msg.error ?? msg.message) }];

    if (type === 'item_started' || type === 'item_completed') {
      return this.convertItem(type === 'item_started' ? 'item/started' : 'item/completed', {
        item: asRecord(msg.item) ?? {},
        itemId: asString(msg.item_id ?? msg.itemId),
      });
    }

    return [];
  }

  private convertItem(method: string, params: Record<string, unknown>): CodexEvent[] {
    const record = item(params);
    const id = itemId(params) ?? asString(record?.id);
    const type = itemType(record?.type ?? record?.itemType ?? record?.kind);
    if (!record || !id || !type) return [];

    if (type === 'agentmessage' && method === 'item/completed') {
      const text = asString(record.text ?? record.message);
      return text ? [{ type: 'agent_message', message: text }] : [];
    }

    if (type === 'commandexecution') {
      if (method === 'item/started') {
        const meta = {
          command: command(record.command ?? record.cmd ?? record.args),
          cwd: asString(record.cwd ?? record.workingDirectory ?? record.working_directory),
        };
        this.commandMeta.set(id, meta);
        return [{ type: 'exec_command_begin', call_id: id, ...meta }];
      }

      const meta = this.commandMeta.get(id) ?? {};
      this.commandMeta.delete(id);
      return [{
        type: 'exec_command_end',
        call_id: id,
        ...meta,
        output: asString(record.output ?? record.stdout ?? record.result),
        stderr: asString(record.stderr),
        exit_code: asNumber(record.exitCode ?? record.exit_code),
      }];
    }

    if (type === 'filechange') {
      if (method === 'item/started') {
        return [{ type: 'patch_apply_begin', call_id: id, changes: record.changes ?? record.change }];
      }
      return [{ type: 'patch_apply_end', call_id: id, changes: record.changes ?? record.change }];
    }

    return [];
  }
}
