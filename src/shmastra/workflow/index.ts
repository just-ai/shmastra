import {AgentStepOptions, createStep} from "@mastra/core/workflows";
import {Agent} from "@mastra/core/agent";
import {MemoryRequestContext, parseMemoryRequestContext} from "@mastra/core/memory";
import type {StandardSchemaWithJSON} from "@mastra/core/schema";

type TextStepOptions = Omit<AgentStepOptions<{ text: string }>, 'structuredOutput'> & {
    structuredOutput?: never;
};

type StructuredStepOptions<TOutput> = Omit<AgentStepOptions<TOutput>, 'structuredOutput'> & {
    structuredOutput: { schema: StandardSchemaWithJSON<TOutput> };
};

/**
 * Creates a workflow step from an agent that outputs plain text.
 *
 * The resulting step returns `{ text: string }`. On every invocation, the wrapper
 * rebuilds the underlying agent step with `memory.thread` / `memory.resource` derived
 * from the current run — so that `ObservationalMemory` (scope: 'thread'), the `recall`
 * tool, semantic recall and working memory all receive a valid threadId. It also seeds
 * `MastraMemory` into `requestContext` as belt-and-suspenders for processors that read
 * it directly.
 *
 * Thread resolution order (per execute call):
 * 1. `requestContext.MastraMemory.thread.id` if already set by the caller
 * 2. `options.memory.thread` if explicitly provided at step creation
 * 3. `args.runId` — unique per workflow run, stable across steps within the run
 *
 * Resource resolution order:
 * 1. `requestContext.MastraMemory.resourceId` if already set
 * 2. `options.memory.resource` if explicitly provided
 * 3. `args.workflowId`
 *
 * @param agent The agent to wrap as a step.
 * @param options Agent step options without `structuredOutput`.
 */
export function createAgentStep<TStepId extends string>(
    agent: Agent<TStepId, any>,
    options?: TextStepOptions,
): ReturnType<typeof createStep<TStepId>>;

/**
 * Creates a workflow step from an agent that produces a structured output.
 *
 * The resulting step returns a value shaped by `structuredOutput.schema` (`TOutput`)
 * instead of `{ text: string }`. Memory handling is identical to the text-output overload.
 *
 * @param agent The agent to wrap as a step.
 * @param options Agent step options including `structuredOutput.schema` defining `TOutput`.
 */
export function createAgentStep<TStepId extends string, TOutput>(
    agent: Agent<TStepId, any>,
    options: StructuredStepOptions<TOutput>,
): ReturnType<typeof createStep<TStepId, TOutput>>;

export function createAgentStep(agent: Agent<any, any>, options?: any): any {
    const outerStep = createStep(agent, options);
    const optThread = options?.memory?.thread;
    const explicitThreadId = typeof optThread === 'string' ? optThread : optThread?.id;
    const explicitResourceId = options?.memory?.resource;

    return {
        ...outerStep,
        execute: async (args: any) => {
            const rc = args.requestContext;
            const fromRc = parseMemoryRequestContext(rc);
            const threadId = fromRc?.thread?.id ?? explicitThreadId ?? args.runId;
            const resourceId = fromRc?.resourceId ?? explicitResourceId ?? args.workflowId;

            if (!fromRc?.thread?.id) {
                rc.set('MastraMemory', {
                    thread: { id: threadId },
                    resourceId,
                } as MemoryRequestContext);
            }

            const runStep = createStep(agent, {
                ...options,
                memory: {
                    ...options?.memory,
                    thread: threadId,
                    resource: resourceId,
                },
            });
            return runStep.execute(args);
        },
    };
}
