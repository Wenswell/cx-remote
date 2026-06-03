export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function truncate(text, max = 3500) {
    if (text.length <= max)
        return text;
    return `${text.slice(0, max - 20)}\n... truncated ...`;
}
export function formatUnknown(value) {
    if (typeof value === 'string')
        return value;
    if (value === null || value === undefined)
        return '';
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
}
export function asRecord(value) {
    if (!value || typeof value !== 'object')
        return null;
    return value;
}
export function asString(value) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}
export function asNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
export function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
