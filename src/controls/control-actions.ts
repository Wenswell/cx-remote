export const CLI_CONTROL_TTL_MS = 30_000;
export const WEB_CONTROL_TTL_MS = 10 * 60 * 1000;

export type ControlIdentity = {
  ownerId: string;
  label: string;
};

export function cliControlIdentity(host: string, pid: number): ControlIdentity {
  return {
    ownerId: `cli:${host}:${pid}`,
    label: `CLI ${host}:${pid}`,
  };
}

export function formatControlClaimed(title: string): string {
  return `Control claimed:\n${title}`;
}

export function formatControlReleased(title: string): string {
  return `Control released:\n${title}`;
}

export function formatStopSent(): string {
  return 'Stop sent.';
}
