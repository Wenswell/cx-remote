export const CLI_CONTROL_TTL_MS = 30_000;
export const WEB_CONTROL_TTL_MS = 10 * 60 * 1000;
export function cliControlIdentity(host, pid) {
    return {
        ownerId: `cli:${host}:${pid}`,
        label: `CLI ${host}:${pid}`,
    };
}
export function formatControlClaimed(title) {
    return `Control claimed:\n${title}`;
}
export function formatControlReleased(title) {
    return `Control released:\n${title}`;
}
export function formatStopSent() {
    return 'Stop sent.';
}
