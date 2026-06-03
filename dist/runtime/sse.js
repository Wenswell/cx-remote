export function encodeSseFrame(data) {
    const id = eventId(data);
    return [
        ...(id === undefined ? [] : [`id: ${id}`]),
        `data: ${JSON.stringify(data)}`,
        '',
        '',
    ].join('\n');
}
export function decodeSseFrame(frame) {
    const data = frame.split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice('data:'.length).trimStart())
        .join('\n');
    return data ? JSON.parse(data) : null;
}
function eventId(data) {
    const id = typeof data === 'object' && data !== null && 'id' in data
        ? Number(data.id)
        : undefined;
    return id !== undefined && Number.isFinite(id) && id > 0 ? id : undefined;
}
