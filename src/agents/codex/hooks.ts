import { resolve } from 'node:path';
import type { CodexNativeActivity, CodexNativeActivityState } from '../../domain/types.js';
import { asRecord, asString } from '../../utils.js';
import { readCodexSessionMetaFromFile } from './sessions.js';

export interface CodexNativeHookEvent extends CodexNativeActivity {
  eventName: string;
}

export const CODEX_NATIVE_ACTIVITY_TTL_MS = 60_000;

const READY_EVENT_NAMES = new Set([
  'sessionstart',
  'sessionresume',
  'ready',
  'initialized',
]);

const WORKING_EVENT_NAMES = new Set([
  'userpromptsubmit',
  'turnstart',
  'pretooluse',
  'posttooluse',
  'tooluse',
  'toolstart',
  'toolend',
  'commandexecutionstart',
  'commandexecutionend',
  'agentmessagedelta',
  'agentmessage',
]);

const APPROVAL_EVENT_NAMES = new Set([
  'permissionrequest',
  'approvalrequest',
  'requestapproval',
  'requestpermission',
  'toolapprovalrequest',
]);

const STOP_EVENT_NAMES = new Set([
  'stop',
  'sessionstop',
  'turncomplete',
  'turnend',
  'complete',
  'completed',
  'finish',
  'finished',
  'exit',
]);

export function normalizeCodexNativeHookEvent(input: unknown, now = Date.now()): CodexNativeHookEvent | null {
  const root = asRecord(input);
  if (!root) return null;

  const payload = hookPayloadCandidates(root);
  const eventName = normalizeEventName(firstString(payload, ['hook_event_name', 'hookEventName', 'event', 'name', 'type']));
  const transcriptPath = firstString(payload, ['transcript_path', 'transcriptPath', 'log_path', 'logPath']);
  const rawSessionId = firstString(payload, ['session_id', 'sessionId', 'id']);
  const turnId = firstString(payload, ['turn_id', 'turnId']);
  const cwdFromPayload = firstString(payload, ['cwd', 'working_directory', 'workingDirectory']);
  const lastAssistantMessage = firstString(payload, [
    'last_assistant_message',
    'lastAssistantMessage',
    'assistant_message',
    'assistantMessage',
    'message',
  ]);

  const transcriptMeta = transcriptPath ? readCodexSessionMetaFromFile(resolve(transcriptPath), undefined) : null;
  const threadId = transcriptMeta?.id || rawSessionId || null;
  if (!threadId) return null;

  const cwd = cwdFromPayload || transcriptMeta?.cwd || null;
  const state = inferState(eventName, payload, turnId, lastAssistantMessage);

  return {
    nativeSessionId: rawSessionId || threadId,
    threadId,
    cwd,
    transcriptPath: transcriptPath ? resolve(transcriptPath) : null,
    turnId: turnId ?? null,
    state,
    lastEventName: eventName || 'unknown',
    lastEventAt: now,
    lastAssistantMessage: state === 'idle' ? lastAssistantMessage ?? null : lastAssistantMessage || null,
    eventName: eventName || 'unknown',
  };
}

export function codexNativeActivityStateAt(
  activity: CodexNativeActivity,
  now = Date.now(),
): CodexNativeActivityState {
  if (isLeaseBackedState(activity.state) && now - activity.lastEventAt >= CODEX_NATIVE_ACTIVITY_TTL_MS) {
    return 'unknown';
  }
  return activity.state;
}

export function codexNativeActivityView(
  activity: CodexNativeActivity,
  now = Date.now(),
): CodexNativeActivity {
  const state = codexNativeActivityStateAt(activity, now);
  return state === activity.state ? activity : { ...activity, state };
}

export function isLeaseBackedCodexNativeActivity(activity: CodexNativeActivity): boolean {
  return isLeaseBackedState(activity.state);
}

function hookPayloadCandidates(root: Record<string, unknown>): Record<string, unknown>[] {
  const candidates = [root];
  for (const key of ['payload', 'data', 'event', 'input', 'message']) {
    const nested = asRecord(root[key]);
    if (nested) candidates.push(nested);
  }
  return candidates;
}

function firstString(candidates: Record<string, unknown>[], keys: string[]): string | undefined {
  for (const candidate of candidates) {
    for (const key of keys) {
      const value = asString(candidate[key]);
      if (value) return value;
    }
  }
  return undefined;
}

function normalizeEventName(value: string | undefined): string {
  return value ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '') : '';
}

function inferState(
  eventName: string,
  payload: Record<string, unknown>[],
  turnId: string | undefined,
  lastAssistantMessage: string | undefined,
): CodexNativeActivityState {
  const compact = normalizeEventName(eventName);
  if (STOP_EVENT_NAMES.has(compact) || compact.includes('stop') || compact.includes('cancel')) return 'idle';
  if (APPROVAL_EVENT_NAMES.has(compact) || compact.includes('approval') || compact.includes('permission')) return 'waiting_approval';
  if (READY_EVENT_NAMES.has(compact)) return 'ready';
  if (WORKING_EVENT_NAMES.has(compact)) return 'working';
  if (compact.includes('submit') || compact.includes('prompt') || compact.includes('delta') || compact.includes('tool')) return 'working';
  if (lastAssistantMessage || payload.some((candidate) => asString(candidate.last_assistant_message) || asString(candidate.lastAssistantMessage))) return 'idle';
  if (turnId) return 'working';
  return 'unknown';
}

function isLeaseBackedState(state: CodexNativeActivityState): boolean {
  return state === 'ready' || state === 'working' || state === 'waiting_approval';
}
