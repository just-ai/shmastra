import {PinoLogger} from "@mastra/loggers";

const BASE64_PATTERN = /data:[^;]+;base64,[A-Za-z0-9+/=]{100,}/g;
const BASE64_REPLACEMENT = '[base64 data trimmed]';

function trimBase64(obj: unknown, depth = 0): unknown {
    if (depth > 10) return obj;
    if (typeof obj === 'string') {
        return obj.replace(BASE64_PATTERN, BASE64_REPLACEMENT);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => trimBase64(item, depth + 1));
    }
    if (obj && typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = trimBase64(value, depth + 1);
        }
        return result;
    }
    return obj;
}

export const logger = new PinoLogger({
    name: 'Mastra',
    level: 'info',
    formatters: {
        log(obj) {
            return trimBase64(obj) as Record<string, unknown>;
        },
    },
});