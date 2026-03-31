import {MastraClient} from "@mastra/client-js";

let _client: MastraClient | undefined;

export async function mastraClient(): Promise<MastraClient> {
    if (!_client) {
        const {mastra} = await import("../../mastra");
        const port = mastra.getServer()?.port ?? process.env.PORT ?? 4111;
        _client = new MastraClient({
            baseUrl: `http://localhost:${port}`,
            apiPrefix: mastra.getServer()?.apiPrefix,
        });
    }
    return _client;
}
