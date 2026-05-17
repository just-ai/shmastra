import { createMastraCode } from 'mastracode'
import {MastraModelOutput} from "@mastra/core/stream";
import {Harness, HarnessThread} from "@mastra/core/harness";
import {RequestContext} from "@mastra/core/request-context";

export interface ShmastraProvider {
    readonly harness: ShmastraHarness;
}

export type ShmastraHarness = Harness & {
    streamMessage: (params: {
        content: string;
        files?: Array<{ data: string; mediaType: string; filename?: string }>;
        requestContext?: RequestContext;
    }) => Promise<MastraModelOutput>;

    answerQuestion: (params: {
        answer: string;
    }) => void;

    findThreadById: (threadId: string) => Promise<HarnessThread | undefined>;

    applyChanges: () => string;
}

export type ShmastraCode = Omit<Awaited<ReturnType<typeof createMastraCode>>, 'harness'> & {
    harness: ShmastraHarness;
}
