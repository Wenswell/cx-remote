export function resolveCodexPermissionModeConfig(mode) {
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
