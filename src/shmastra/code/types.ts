import { createMastraCode } from 'mastracode'
import {MastraModelOutput} from "@mastra/core/stream";
import {Harness, HarnessThread} from "@mastra/core/harness";
import {RequestContext} from "@mastra/core/request-context";
import {TracingContext, TracingOptions} from "@mastra/core/observability";
import {AskEnvVarsArgs} from "./tools/ask-env-vars-args";

export interface ShmastraProvider {
    readonly harness: ShmastraHarness;
}

export type ShmastraHarness = Harness & {
    streamMessage: (params: {
        content: string;
        files?: Array<{ data: string; mediaType: string; filename?: string }>;
        tracingContext?: TracingContext;
        tracingOptions?: TracingOptions;
        requestContext?: RequestContext;
    }) => Promise<MastraModelOutput>;

    answerQuestion: (params: {
        answer: string;
    }) => void;

    findThreadById: (threadId: string) => Promise<HarnessThread | undefined>;

    applyChanges: () => string;
    askEnvVars: (input: AskEnvVarsArgs) => Promise<string[]>;
    setEnvVars: (vars: Record<string, any>) => void;
    awaitConnectionAuth: (toolkit: string) => Promise<void>;
    completeConnectionAuth: (toolkit: string) => void;
}

export type ShmastraCode = Omit<Awaited<ReturnType<typeof createMastraCode>>, 'harness'> & {
    harness: ShmastraHarness;
}
