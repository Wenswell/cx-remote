import type { ApprovalPolicy, CodexPermissionMode } from '../../domain/types.js';

export type CodexPermissionModeConfig = {
  approvalPolicy: ApprovalPolicy;
  permissions: ':workspace' | ':read-only' | ':danger-full-access';
};

export function resolveCodexPermissionModeConfig(mode: CodexPermissionMode): CodexPermissionModeConfig {
  switch (mode) {
    case 'default':
      return {
        approvalPolicy: 'on-request',
        permissions: ':workspace',
      };
    case 'read-only':
      return {
        approvalPolicy: 'never',
        permissions: ':read-only',
      };
    case 'safe-yolo':
      return {
        approvalPolicy: 'on-failure',
        permissions: ':workspace',
      };
    case 'yolo':
      return {
        approvalPolicy: 'never',
        permissions: ':danger-full-access',
      };
  }
}
