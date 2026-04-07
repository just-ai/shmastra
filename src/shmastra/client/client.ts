import {MastraClient} from "@mastra/client-js";
import {getMastra} from "../utils";

let _client: MastraClient | undefined;

export async function mastraClient(): Promise<MastraClient> {
    if (!_client) {
        const mastra = await getMastra();
        const port = mastra.getServer()?.port ?? process.env.PORT ?? 4111;
        _client = new MastraClient({
            baseUrl: `http://localhost:${port}`,
            apiPrefix: mastra.getServer()?.apiPrefix,
        });
    }
    return _client;
}
