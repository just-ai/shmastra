import {getPublicUrl} from "../env";
import {getMastra} from "../utils";

async function getBaseUrl(): Promise<string> {
    const publicUrl = await getPublicUrl();
    if (publicUrl) return publicUrl.replace(/\/$/, "");
    const mastra = await getMastra();
    const port = mastra.getServer()?.port ?? process.env.PORT ?? 4111;
    return `http://localhost:${port}`;
}

export function resolveRelativeUrls(text: string): string {
    // Resolve relative URLs inside markdown links [text](url) and images ![alt](url)
    const baseUrl = getBaseUrl();
    return text.replace(/(!?\[[^\]]*\])\((\/[^)]+)\)/g, `$1(${baseUrl}$2)`);
}

export function fixTelegramMarkdownV1(text: string) {
    return text.replace(/^- /gm, '• ');
}