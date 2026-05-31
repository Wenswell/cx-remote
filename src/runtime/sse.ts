export type SsePayload = Record<string, unknown>;

export function encodeSseFrame(data: unknown): string {
  const id = eventId(data);
  return [
    ...(id === undefined ? [] : [`id: ${id}`]),
    `data: ${JSON.stringify(data)}`,
    '',
    '',
  ].join('\n');
}

export function decodeSseFrame(frame: string): SsePayload | null {
  const data = frame.split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .join('\n');
  return data ? JSON.parse(data) as SsePayload : null;
}

function eventId(data: unknown): number | undefined {
  const id = typeof data === 'object' && data !== null && 'id' in data
    ? Number((data as { id?: unknown }).id)
    : undefined;
  return id !== undefined && Number.isFinite(id) && id > 0 ? id : undefined;
}
