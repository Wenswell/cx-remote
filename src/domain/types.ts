export type AgentKind = 'codex';

export type SessionStatus = 'idle' | 'starting' | 'running' | 'waiting_approval' | 'error';

export type ControlType = 'web' | 'telegram' | 'cli';

export type ApprovalPolicy = 'untrusted' | 'on-failure' | 'on-request' | 'never';

export type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access';

export type CodexPermissionMode = 'default' | 'read-only' | 'safe-yolo' | 'yolo';

export const CODEX_MODEL_OPTIONS = ['gpt-5.5', 'gpt-5.4'] as const;

export const CODEX_REASONING_EFFORT_OPTIONS = ['xhigh', 'high', 'medium'] as const;

export type ApprovalType = 'tool' | 'choice';

export type ApprovalStatus = 'pending' | 'resolved' | 'expired';

export type PromptJobStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled';

export interface CodexSessionConfig {
  model?: string;
  reasoningEffort?: string;
  permissionMode: CodexPermissionMode;
  search: boolean;
}

export type CodexSessionConfigPatch = Partial<CodexSessionConfig>;

export interface Session {
  id: string;
  title: string;
  cwd: string;
  agent: AgentKind;
  status: SessionStatus;
  codexThreadId: string | null;
  currentTurnId: string | null;
  controlOwner: ControlType | null;
  controlOwnerId: string | null;
  controlLabel: string | null;
  controlLeaseExpiresAt: number | null;
  controlUpdatedAt: number | null;
  config: CodexSessionConfig;
  createdAt: number;
  updatedAt: number;
  lastError: string | null;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  kind: 'text' | 'event' | 'error';
  content: string;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface Approval {
  id: string;
  sessionId: string;
  type: ApprovalType;
  toolName: string;
  input: unknown;
  status: ApprovalStatus;
  decision: string | null;
  response: unknown;
  createdAt: number;
  resolvedAt: number | null;
  source: ControlType | null;
}

export interface PromptJob {
  id: string;
  sessionId: string;
  text: string;
  source: ControlType;
  ownerId: string | null;
  controlLabel: string | null;
  status: PromptJobStatus;
  error: string | null;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface ControlBinding {
  id: string;
  controlType: ControlType;
  externalId: string;
  sessionId: string;
  createdAt: number;
  updatedAt: number;
}

export interface HubEvent {
  id?: number;
  type:
    | 'session.created'
    | 'session.updated'
    | 'session.deleted'
    | 'session.control.updated'
    | 'message.created'
    | 'message.delta'
    | 'approval.created'
    | 'approval.resolved'
    | 'runtime.event'
    | 'runtime.error';
  sessionId: string | null;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface SessionDetail {
  session: Session;
  messages: Message[];
  approvals: Approval[];
  queue: PromptJob[];
  eventCursor: number;
}

export type ApprovalDecision = 'approved' | 'approved_for_session' | 'denied' | 'abort';

export interface ApprovalResult {
  decision: ApprovalDecision;
  reason?: string;
}

export interface ChoiceAnswer {
  decision: 'accept';
  answers: Record<string, string[]> | Record<string, { answers: string[] }>;
}

export type ChoiceResult = ChoiceAnswer | { decision: 'decline' | 'cancel' };

export interface ChoiceOption {
  label: string;
  value: string;
  questionId: string;
}

export interface CodexEvent {
  type:
    | 'thread_started'
    | 'task_started'
    | 'task_complete'
    | 'task_failed'
    | 'turn_aborted'
    | 'agent_message'
    | 'agent_message_delta'
    | 'agent_reasoning_delta'
    | 'exec_command_begin'
    | 'exec_command_end'
    | 'patch_apply_begin'
    | 'patch_apply_end';
  [key: string]: unknown;
}
