import { getSettingValue, getSettingsPath, listSettingFields, loadConfig, maskSecret, maskSettings, readSettings, setSettingValue, } from '../config/config.js';
import { findSettingField } from '../config/fields.js';
export function runConfigCommand(argv) {
    const subcommand = argv[0] || 'show';
    const revealSecrets = argv.includes('--reveal-secrets');
    if (subcommand === 'path') {
        console.log(getSettingsPath());
        return;
    }
    if (subcommand === 'show') {
        if (argv.includes('--resolved')) {
            const { config } = loadConfig();
            printJson(revealSecrets ? config : maskSettings(config));
            return;
        }
        const settings = readSettings();
        printJson(revealSecrets ? settings : maskSettings(settings));
        return;
    }
    if (subcommand === 'get') {
        const key = argv[1];
        if (!key)
            throw new Error('Usage: cx-remote config get <key>');
        const field = findSettingField(key);
        const value = getSettingValue(readSettings(), key);
        printValue(field, value, revealSecrets);
        return;
    }
    if (subcommand === 'set') {
        const key = argv[1];
        const value = argv[2];
        if (!key || value === undefined)
            throw new Error('Usage: cx-remote config set <key> <value>');
        const field = findSettingField(key);
        const settings = setSettingValue(key, value);
        console.log(`updated ${key} = ${formatValue(getSettingValue(settings, key), field, false)}`);
        if (field.restartRequired)
            console.log('restart required');
        return;
    }
    if (subcommand === 'validate') {
        readSettings();
        console.log(`config: ok ${getSettingsPath()}`);
        return;
    }
    if (subcommand === 'list') {
        printFields(revealSecrets);
        return;
    }
    throw new Error(`Unknown config command: ${subcommand}`);
}
function printFields(revealSecrets) {
    const settings = readSettings();
    console.log(['key', 'type', 'env', 'restart', 'secret', 'value'].join('\t'));
    for (const field of listSettingFields()) {
        const value = getSettingValue(settings, field.key);
        console.log([
            field.key,
            field.type,
            field.env ?? '-',
            field.restartRequired ? 'yes' : 'no',
            field.secret ? 'yes' : 'no',
            formatValue(value, field, revealSecrets),
        ].join('\t'));
    }
}
function printJson(value) {
    console.log(JSON.stringify(value, null, 2));
}
function printValue(field, value, revealSecrets) {
    console.log(formatValue(value, field, revealSecrets));
}
function formatValue(value, field, revealSecrets) {
    if (field.secret && !revealSecrets) {
        if (typeof value === 'string')
            return value ? maskSecret(value) : 'missing';
        if (value && typeof value === 'object')
            return JSON.stringify(maskSettings({ value }).value);
    }
    if (Array.isArray(value))
        return value.join(',');
    if (value === undefined || value === null)
        return '';
    if (typeof value === 'object')
        return JSON.stringify(value);
    return String(value);
}
