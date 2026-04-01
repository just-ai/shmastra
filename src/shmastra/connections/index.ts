import type { Composio } from "@composio/core";
import type { MastraProvider } from "@composio/mastra";
import { isConnected, requireComposio } from './composio';

const userId = process.env.USER_ID || "shmastra-user-id";

let sessionPromise: Promise<Awaited<ReturnType<Composio<MastraProvider>["create"]>> | null> | null = null;

function getSession() {
    if (!isConnected()) return null;
    if (!sessionPromise) {
        sessionPromise = requireComposio().create(userId).catch(() => null);
    }
    return sessionPromise;
}

async function getAllToolkits() {
    if (!isConnected()) return [];
    try {
        return await requireComposio().toolkits.get({});
    } catch {
        return [];
    }
}

async function getToolkitsTools(toolkits: string[]) {
    if (!isConnected()) return [];
    try {
        return await requireComposio().tools.getRawComposioTools({ toolkits });
    } catch {
        return [];
    }
}

async function getConnectedToolkits() {
    const session = await getSession();
    if (!session) return { items: [] };
    try {
        return await session.toolkits({ isConnected: true });
    } catch {
        return { items: [] };
    }
}

async function searchTools(query: string) {
    if (!isConnected()) {
        console.error("Composio could not be connected");
        return [];
    }
    const session = await getSession();
    if (!session) {
        console.error("Composio session cannot be created");
        return [];
    }

    try {
        const c = requireComposio();
        const s = session as any;
        const [rawSearchResult, toolkitsResult, allToolkits] = await Promise.all([
            s.client.toolRouter.session.search(s.sessionId, {
                queries: [{ use_case: query }],
            }),
            session.toolkits(),
            c.toolkits.get({}),
        ]);
        const searchResult = {
            success: rawSearchResult.success as boolean,
            results: (rawSearchResult.results as any[]).map((r: any) => ({
                primaryToolSlugs: r.primary_tool_slugs as string[],
                toolkits: r.toolkits as string[],
            })),
        };
        if (!searchResult.success) {
            console.log(rawSearchResult);
            return [];
        }
        const oauthSlugs = new Set(
            allToolkits
                .filter(t => t.authSchemes?.some(s => s.startsWith("OAUTH")))
                .map(t => t.slug)
        );
        const connectedSlugs = new Set(
            toolkitsResult.items
                .filter(t => t.connection?.isActive)
                .map(t => t.slug)
        );
        return searchResult.results
            .filter(r => r.toolkits.some(t => oauthSlugs.has(t)))
            .flatMap(r =>
                r.primaryToolSlugs.map(slug => ({
                    tool: slug,
                    toolkit: r.toolkits[0] ?? null,
                    connected: r.toolkits.some(t => connectedSlugs.has(t)),
                }))
            );
    } catch (error) {
        console.error(JSON.stringify(error, null, 2));
        return [];
    }
}

async function getSessionTools(toolSlugs: string[]) {
    if (!isConnected() || !toolSlugs.length) return {};
    try {
        const all = await requireComposio().tools.get(userId, { tools: toolSlugs }, {
            modifySchema: ({ schema }) => ({ ...schema, outputParameters: undefined }),
        });
        const slugs = new Set(toolSlugs);
        return Object.fromEntries(
            Object.entries(all).filter(([key]) => slugs.has(key))
        );
    } catch {
        return {};
    }
}

async function getToolSchema(toolSlug: string) {
    if (!isConnected()) return null;
    try {
        const tool = await requireComposio().tools.getRawComposioToolBySlug(toolSlug);
        return {
            input: tool.inputParameters ?? null,
            output: tool.outputParameters ?? null,
        };
    } catch {
        return null;
    }
}

async function isToolkitConnected(toolkit: string) {
    const session = await getSession();
    if (!session) return false;
    try {
        const result = await session.toolkits({ toolkits: [toolkit] });
        return result.items[0]?.connection?.isActive ?? false;
    } catch {
        return false;
    }
}

async function authorizeToolkit(toolkit: string, callbackUrl?: string) {
    if (!isConnected()) return null;
    const session = await getSession();
    if (!session) return null;
    try {
        const c = requireComposio();
        const [authRequest, details] = await Promise.all([
            session.authorize(toolkit, { callbackUrl }),
            c.toolkits.get(toolkit),
        ]);
        return {
            redirectUrl: authRequest.redirectUrl,
            toolkit: {
                name: details.name,
                slug: details.slug,
                logo: details.meta?.logo,
                description: details.meta?.description,
            },
        };
    } catch {
        return null;
    }
}

export default {
    isConnected,
    getAllToolkits,
    getToolkitsTools,
    getConnectedToolkits,
    searchTools,
    getSessionTools,
    isToolkitConnected,
    authorizeToolkit,
    getToolSchema,
};
