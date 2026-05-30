import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../config/config.js';
import type { Approval, ApprovalResult, ChoiceOption, ChoiceResult, ControlType } from '../domain/types.js';
import type { Store } from '../store/store.js';
import { asRecord, asString } from '../utils.js';
import { EventBus } from './event-bus.js';
import { logger } from '../logger.js';

type PendingApproval = {
  type: 'approval';
  resolve: (result: ApprovalResult) => void;
  timer: NodeJS.Timeout;
};

type PendingChoice = {
  type: 'choice';
  resolve: (result: ChoiceResult) => void;
  timer: NodeJS.Timeout;
  options: ChoiceOption[];
};

type Pending = PendingApproval | PendingChoice;

export class PermissionService {
  private pending = new Map<string, Pending>();

  constructor(
    private readonly store: Store,
    private readonly events: EventBus,
    private readonly config: AppConfig,
  ) {}

  async requestApproval(sessionId: string, toolName: string, input: unknown): Promise<ApprovalResult> {
    const autoApproved = this.autoApprove(toolName, input);
    if (autoApproved) return autoApproved;

    const approval = this.store.createApproval({
      id: randomUUID(),
      sessionId,
      type: 'tool',
      toolName,
      input,
      status: 'pending',
      decision: null,
      response: null,
      createdAt: Date.now(),
      resolvedAt: null,
      source: null,
    });
    this.events.publish({ type: 'approval.created', sessionId, payload: { approval } });
    logger.info('approval created', { sessionKey: sessionId, toolName, approvalId: approval.id });

    return new Promise<ApprovalResult>((resolve) => {
      const timer = setTimeout(() => {
        void this.resolveApproval(approval.id, 'denied', 'cli', 'approval timed out').catch(() => {});
      }, this.config.approvals.timeoutMs);
      this.pending.set(approval.id, { type: 'approval', resolve, timer });
    });
  }

  async requestChoice(sessionId: string, input: unknown): Promise<ChoiceResult> {
    const options = extractChoiceOptions(input);
    const approval = this.store.createApproval({
      id: randomUUID(),
      sessionId,
      type: 'choice',
      toolName: 'CodexChoice',
      input: { input, options },
      status: 'pending',
      decision: null,
      response: null,
      createdAt: Date.now(),
      resolvedAt: null,
      source: null,
    });
    this.events.publish({ type: 'approval.created', sessionId, payload: { approval } });
    logger.info('choice created', { sessionKey: sessionId, approvalId: approval.id });

    return new Promise<ChoiceResult>((resolve) => {
      const timer = setTimeout(() => {
        void this.resolveApproval(approval.id, 'cancel', 'cli', 'choice timed out').catch(() => {});
      }, this.config.approvals.timeoutMs);
      this.pending.set(approval.id, { type: 'choice', resolve, timer, options });
    });
  }

  async resolveApproval(
    approvalId: string,
    decision: string,
    source: ControlType,
    reason?: string,
  ): Promise<Approval> {
    const approval = this.store.getApproval(approvalId);
    if (!approval) throw new Error(`Approval not found: ${approvalId}`);
    if (approval.status !== 'pending') return approval;

    const pending = this.pending.get(approvalId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pending.delete(approvalId);
    }

    let response: ApprovalResult | ChoiceResult;
    if (approval.type === 'choice') {
      response = choiceResponse(pending, decision);
      if ('decision' in response && response.decision === 'cancel' && reason) {
        response = { decision: 'cancel' };
      }
    } else {
      response = approvalResponse(decision, reason);
    }

    const next = this.store.updateApproval({
      ...approval,
      status: 'resolved',
      decision,
      response,
      resolvedAt: Date.now(),
      source,
    });

    if (pending?.type === 'choice') {
      pending.resolve(response as ChoiceResult);
    } else if (pending?.type === 'approval') {
      pending.resolve(response as ApprovalResult);
    }

    this.events.publish({ type: 'approval.resolved', sessionId: approval.sessionId, payload: { approval: next } });
    logger.info('approval resolved', { sessionKey: approval.sessionId, approvalId, decision });
    return next;
  }

  expireSessionApprovals(sessionId: string, reason: string): number {
    const approvals = this.store.listPendingApprovals(sessionId);
    for (const approval of approvals) {
      this.expireApproval(approval, reason);
    }
    return approvals.length;
  }

  countPending(sessionId?: string): number {
    return this.store.listPendingApprovals(sessionId).length;
  }

  shutdown(): void {
    for (const approval of this.store.listPendingApprovals()) {
      this.expireApproval(approval, 'shutdown');
    }
  }

  private expireApproval(approval: Approval, reason: string): Approval {
    const pending = this.pending.get(approval.id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pending.delete(approval.id);
    }

    const response: ApprovalResult | ChoiceResult = approval.type === 'choice'
      ? { decision: 'cancel' }
      : { decision: 'denied', reason };

    const next = this.store.updateApproval({
      ...approval,
      status: 'expired',
      decision: 'expired',
      response,
      resolvedAt: Date.now(),
      source: null,
    });

    if (pending?.type === 'choice') {
      pending.resolve(response as ChoiceResult);
    } else if (pending?.type === 'approval') {
      pending.resolve(response as ApprovalResult);
    }

    this.events.publish({ type: 'approval.resolved', sessionId: approval.sessionId, payload: { approval: next } });
    logger.info('approval expired', { sessionKey: approval.sessionId, approvalId: approval.id, reason });
    return next;
  }

  private autoApprove(toolName: string, input: unknown): ApprovalResult | null {
    if (toolName !== 'CodexBash') return null;
    const command = extractCommand(input);
    if (!command) return null;

    const explicitPattern = this.config.approvals.autoApproveCommands.find((pattern) => matchesCommandPattern(command, pattern));
    if (explicitPattern) {
      logger.info('approval auto approved', { toolName, command, pattern: explicitPattern });
      return { decision: 'approved' };
    }

    if (this.config.approvals.autoApproveReadonly && isReadonlyCommand(command)) {
      logger.info('approval auto approved', { toolName, command, pattern: 'readonly' });
      return { decision: 'approved' };
    }

    return null;
  }
}

function approvalResponse(decision: string, reason?: string): ApprovalResult {
  if (decision === 'approved' || decision === 'allow') return { decision: 'approved' };
  if (decision === 'approved_for_session' || decision === 'allow_session') return { decision: 'approved_for_session' };
  if (decision === 'abort') return { decision: 'abort', reason };
  return { decision: 'denied', reason };
}

function choiceResponse(pending: Pending | undefined, decision: string): ChoiceResult {
  if (!pending || pending.type !== 'choice') return { decision: 'cancel' };
  if (decision === 'cancel' || decision === 'denied' || decision === 'deny') return { decision: 'cancel' };
  const index = Number(decision);
  const option = Number.isInteger(index) ? pending.options[index] : pending.options.find((candidate) => candidate.value === decision);
  if (!option) return { decision: 'cancel' };
  return {
    decision: 'accept',
    answers: { [option.questionId]: [option.value] },
  };
}

function extractCommand(input: unknown): string | null {
  const record = asRecord(input);
  const command = record?.command;
  if (typeof command === 'string') return command.trim() || null;
  if (Array.isArray(command)) {
    const text = command.map((part) => String(part)).join(' ').trim();
    return text || null;
  }
  return null;
}

function matchesCommandPattern(command: string, pattern: string): boolean {
  const normalizedPattern = pattern.trim();
  if (!normalizedPattern) return false;

  if (!normalizedPattern.includes('*')) {
    return command.trim().toLowerCase() === normalizedPattern.toLowerCase();
  }

  const escaped = normalizedPattern
    .split('*')
    .map((part) => part.replace(/[\\^$+?.()|[\]{}]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`, 'i').test(command.trim());
}

function isReadonlyCommand(command: string): boolean {
  const text = command.trim();
  if (!text || /[;&|>`\r\n]/.test(text)) return false;

  return [
    /^flai\s+context(?:\s|$)/i,
    /^git\s+(?:status|diff|show|log)(?:\s|$)/i,
    /^rg(?:\s|$)/i,
    /^ls(?:\s|$)/i,
    /^dir(?:\s|$)/i,
    /^Get-ChildItem(?:\s|$)/i,
    /^Get-Content(?:\s|$)/i,
    /^Select-String(?:\s|$)/i,
  ].some((pattern) => pattern.test(text));
}

function extractChoiceOptions(input: unknown): ChoiceOption[] {
  const root = asRecord(input) ?? {};
  const questions = Array.isArray(root.questions)
    ? root.questions
    : Array.isArray(root.items)
      ? root.items
      : [root];

  const out: ChoiceOption[] = [];
  for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
    const question = asRecord(questions[questionIndex]) ?? {};
    const questionId = asString(question.id ?? question.name ?? question.key) ?? `q${questionIndex + 1}`;
    const candidates = Array.isArray(question.options)
      ? question.options
      : Array.isArray(question.choices)
        ? question.choices
        : [];

    for (const candidate of candidates) {
      const record = asRecord(candidate);
      const label = record
        ? asString(record.label ?? record.text ?? record.title ?? record.value)
        : asString(candidate);
      const value = record
        ? asString(record.value ?? record.id ?? record.label ?? record.text)
        : asString(candidate);
      if (label && value) out.push({ label, value, questionId });
    }
  }

  if (out.length === 0) out.push({ label: 'Continue', value: 'continue', questionId: 'answer' });
  return out;
}
