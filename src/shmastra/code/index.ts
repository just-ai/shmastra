import { createMastraCode } from 'mastracode'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { ReadableStream } from 'node:stream/web'

import { OBSERVER_MODELS, DEVELOPER_MODELS, findAvailableModel } from '../providers'
import {Config} from "@mastra/core/mastra";
import {MastraModelOutput} from "@mastra/core/stream";
import {Harness} from "@mastra/core/harness";
import {RequestContext} from "@mastra/core/request-context";
import {getStorageDir} from "../files";
import {copyProjectToWorkdir, copyWorkdirToProject} from "./sync";
import {patchInstructions} from "./instructions";
import {createApplyChangesTool} from "./tools/apply-changes";
import {askEnvVarsTool} from "./tools/ask-env-vars-args";
import {ShmastraCode, ShmastraHarness, ShmastraProvider} from "./types";
import {queryDocumentsTool} from "../rag";
import {Agent} from "@mastra/core/agent";
import {mastraClientAgent} from "../client";
import {searchMcpServersTool} from "../mcp/tools";
import {DEFAULT_MAX_STEPS, deduplicateItemIds} from "../utils";
import {stepCountIs} from "ai";
import connections from "../connections";
import {connectToolkitTool, executeToolkitTool, getToolSchemaTool, searchToolkitsTool} from "../connections/tools";
import {isDryRun} from "../env";
import {projectRootPath} from "../../mastra/shmastra";

export type {ShmastraCode, ShmastraHarness, ShmastraProvider};

const FILTER_TOOLS = ["request_access", "submit_plan", "mkdir", "file_stat", "ast_smart_edit", "skill_search"];

class ShmastraProviderImpl implements ShmastraProvider {
    harness!: ShmastraHarness;

    init(harness: ShmastraHarness) {
        if (this.harness) throw new Error("Harness is already initialized");
        this.harness = harness;
    }
}

export async function createShmastraCode(config: Config): Promise<ShmastraCode> {
    const cwd = isDryRun ? projectRootPath : await copyProjectToWorkdir();
    const provider = new ShmastraProviderImpl();

    const omModelId = findAvailableModel(OBSERVER_MODELS);
    const connectionsTools = {};
    if (connections.isConnected()) {
        Object.assign(connectionsTools, {
            search_toolkits: searchToolkitsTool,
            get_toolkit_tool_schema: getToolSchemaTool,
            execute_toolkit_tool: executeToolkitTool,
            connect_toolkit: connectToolkitTool,
        });
    }

    const { harness, authStorage, mcpManager, ...code } = await createMastraCode({
        cwd,
        subagents: [
            mastraClientAgent
        ],
        initialState: {
            yolo: true,
            observationThreshold: 50_000,
            reflectionThreshold: 80_000,
            ...omModelId && {
                observerModelId: omModelId,
                reflectorModelId: omModelId,
            },
        },
        disabledTools: FILTER_TOOLS,
        storage: {
            backend: "libsql",
            isRemote: false,
            url: `file:${getStorageDir()}/code.db`
        },
        extraTools: {
            apply_changes: createApplyChangesTool(provider),
            ask_env_vars_safely: askEnvVarsTool,
            query_documents: queryDocumentsTool,
            search_mcp_servers: searchMcpServersTool,
            ...connectionsTools,
        } as Record<string, any>,
    });

    // Only set API key auth if not already logged in via OAuth
    if (!authStorage.isLoggedIn("anthropic") && process.env.ANTHROPIC_API_KEY) {
        authStorage.set("anthropic", {
            type: "api_key",
            key: process.env.ANTHROPIC_API_KEY,
        });
    }

    const sh = harness as unknown as ShmastraHarness;

    patchHarness(sh, config);
    provider.init(sh);

    await harness.init();
    await mcpManager?.init();

    if (mcpManager?.hasServers()) {
        console.log(`${mcpManager?.getServerStatuses().length} MCP servers are configured`);
    }

    await initModels(sh);

    return { ...code, mcpManager, authStorage, harness: sh };
}

async function initModels(harness: Harness) {
    const availableModels = (await harness.listAvailableModels()).filter(m => m.hasApiKey)
    const currentModelId = harness.getCurrentModelId()

    if (!currentModelId || !availableModels.some(m => m.id === currentModelId)) {
        const developerModel = availableModels.find(m => DEVELOPER_MODELS.some(d => m.id === d))
        if (developerModel) {
            await harness.switchModel({ modelId: developerModel.id })
        }
    }

    const observerModel = availableModels.find(m => OBSERVER_MODELS.some(f => m.id === f))
    if (observerModel) {
        if (harness.getObserverModelId() !== observerModel.id) {
            await harness.switchObserverModel({ modelId: observerModel.id })
        }
        if (harness.getReflectorModelId() !== observerModel.id) {
            await harness.switchReflectorModel({ modelId: observerModel.id })
        }
    }
}

function patchHarness(harness: ShmastraHarness, config: Config) {
    installStream(harness);
    installOmFailureSuppression(harness);
    patchInstructions(harness, config);
    installAnswerQuestion(harness);
    installFindThreadById(harness);
    installApplyChanges(harness);
    installChainedSuspensionFix(harness);
    restrictSkillPaths(harness);
    filterTools(harness);
}


// Mastra's `handleToolResume` unconditionally clears
// `pendingSuspensionRunId/ToolCallId` after `await processStream(...)`.
// If the resumed run hits a NEW tool suspension before finishing (e.g.
// the agent calls `ask_env_vars_safely` a second time), the harness sets
// the new pending suspension fields during `processStream`, but they get
// wiped on return — so the next `respondToToolSuspension` call is a
// silent no-op. Track new suspensions that fire during a resume and
// restore them after the original method finishes.
function installChainedSuspensionFix(harness: ShmastraHarness) {
    const h = harness as unknown as {
        pendingSuspensionRunId: string | null;
        pendingSuspensionToolCallId: string | null;
        getCurrentRunId(): string | null;
    };

    const state: {
        watching: boolean;
        captured: { runId: string | null; toolCallId: string } | null;
    } = { watching: false, captured: null };

    harness.subscribe(event => {
        if (state.watching && event.type === 'tool_suspended') {
            state.captured = {
                runId: h.getCurrentRunId(),
                toolCallId: event.toolCallId,
            };
        }
    });

    const original = harness.respondToToolSuspension.bind(harness);
    harness.respondToToolSuspension = async function (params: Parameters<typeof original>[0]) {
        state.watching = true;
        state.captured = null;
        try {
            await original(params);
        } finally {
            state.watching = false;
        }
        const captured = state.captured as { runId: string | null; toolCallId: string } | null;
        if (!h.pendingSuspensionRunId && captured?.runId) {
            h.pendingSuspensionRunId = captured.runId;
            h.pendingSuspensionToolCallId = captured.toolCallId;
        }
    } as typeof harness.respondToToolSuspension;
}

function restrictSkillPaths(harness: ShmastraHarness) {
    const originalWorkspaceFn = (harness as any).workspaceFn;
    if (typeof originalWorkspaceFn !== 'function') return;

    const allowedSkillPaths = [
        path.join(process.cwd(), '.mastracode', 'skills'),
        path.join(os.homedir(), '.mastracode', 'skills'),
    ];

    (harness as any).workspaceFn = function (this: any, ...args: any[]) {
        const result = originalWorkspaceFn.apply(this, args);

        const patchWorkspace = (ws: any) => {
            if (ws?._config) {
                ws._config.skills = allowedSkillPaths;
                ws._skills = undefined;
            }
            return ws;
        };

        if (result && typeof result.then === 'function') {
            return result.then(patchWorkspace);
        }
        return patchWorkspace(result);
    };
}

function filterTools(harness: ShmastraHarness) {
    const agent = harness.getCurrentMode().agent as Agent;

    const originalStream = agent.stream.bind(agent);
    agent.stream = function (messages: any, options?: any) {
        const theirs = options?.prepareStep;
        return originalStream(messages, {
            ...options,
            stopWhen: options?.stopWhen ?? stepCountIs(DEFAULT_MAX_STEPS),
            prepareStep: async (args: any) => {
                const fromTheirs = theirs ? await theirs(args) : undefined;

                let tools = Object.keys(args.tools ?? {});
                if (fromTheirs?.activeTools) {
                    const allow = new Set(fromTheirs.activeTools as string[]);
                    tools = tools.filter(n => allow.has(n));
                }
                tools = tools.filter(n => !FILTER_TOOLS.includes(n));

                return {
                    ...fromTheirs,
                    activeTools: tools,
                    messages: deduplicateItemIds(fromTheirs?.messages ?? args.messages),
                };
            }
        });
    };

    const originalResume = agent.resumeStream.bind(agent);
    agent.resumeStream = function (resumeData: any, options?: any) {
        return originalResume(resumeData, {
            ...options,
            stopWhen: options?.stopWhen ?? stepCountIs(DEFAULT_MAX_STEPS),
        });
    } as typeof agent.resumeStream;
}

function installAnswerQuestion(harness: ShmastraHarness) {
    let currentQuestionId: string;
    harness.subscribe(event => {
        if (event.type === 'ask_question') {
            currentQuestionId = event.questionId;
        }
    });
    harness.answerQuestion = (params: { answer: string }) => {
        harness.respondToQuestion({...params, questionId: currentQuestionId});
    }
}

function installFindThreadById(harness: ShmastraHarness) {
    harness.findThreadById = async (threadId: string) => {
        return (await harness.listThreads()).find(t => t.id === threadId);
    }
}

function installApplyChanges(harness: ShmastraHarness) {
    let applyChanges = false;

    harness.subscribe(event => {
        if (!applyChanges) return;
        // `agent_end` covers normal completion, suspension, abort, and the
        // error path from `handleSubscribedStreamError`. `error` is a
        // belt-and-suspenders in case an error fires without a matching
        // `agent_end` (shouldn't happen in current mastra core, but cheap).
        if (event.type === "agent_end" || event.type === "error") {
            applyChanges = false;
            copyWorkdirToProject().catch((err) => console.error(err));
        }
    });

    harness.applyChanges = () => {
        const version = new Date().getTime().toString();
        fs.writeFileSync(path.resolve(projectRootPath, '.version'), version, 'utf8');
        applyChanges = true;
        return version;
    }
}

function repairCorruptedModel(errorMessage: string) {
    const match = errorMessage.match(/not found at (.+)/);
    if (!match) return;
    const missingFile = match[1];
    const modelDir = path.dirname(missingFile);
    if (!fs.existsSync(modelDir)) return;
    try {
        fs.rmSync(modelDir, { recursive: true });
        const tarGz = modelDir + '.tar.gz';
        if (fs.existsSync(tarGz)) fs.unlinkSync(tarGz);
        console.warn(`[shmastra] Removed corrupted model cache: ${modelDir}`);
    } catch (err) {
        console.error(`[shmastra] Failed to clean model cache: ${err}`);
    }
}

function installOmFailureSuppression(harness: ShmastraHarness) {
    let suppressNextAbort = false;

    harness.subscribe((event: any) => {
        if (event.type === 'error' && event.error?.message?.startsWith('Observational memory')) {
            console.error(event.error.message);
            suppressNextAbort = true;
            repairCorruptedModel(event.error.message);
        }
    });

    const originalAbort = harness.abort.bind(harness);
    harness.abort = function () {
        if (suppressNextAbort) {
            suppressNextAbort = false;
            console.warn('[shmastra] OM failure detected — continuing generation');
            return;
        }
        originalAbort();
    };
}

function installStream(harness: any) {
    // In @mastra/core 0.18+ harness.sendMessage no longer routes through
    // `processStream(response)` — it goes via `sendSignal` and a per-thread
    // subscription consumed by `processSubscribedThreadStream`. So we open
    // our own independent subscription via `agent.subscribeToThread` (each
    // subscriber gets its own async-generator stream backed by a fresh
    // `MastraModelOutput.fullStream` reader) and fire `sendMessage` to drive
    // a new run into it.
    harness.streamMessage = async function (params: {
        content: string;
        files?: Array<{ data: string; mediaType: string; filename?: string }>;
        requestContext?: RequestContext;
    }): Promise<MastraModelOutput> {
        const agent: Agent = this.getCurrentMode().agent;

        if (!this.getCurrentThreadId()) {
            const thread = await this.createThread();
            await this.switchThread({ threadId: thread.id });
        }
        const threadId = this.getCurrentThreadId();

        // After abort(), the previous run's status can still be "running"
        // for a few microtasks while the model stream finalizes. If we
        // subscribe before that completes, the new subscription replays
        // the aborted run's chunks (including its `start` with an old
        // messageId), which collides with the message tree on the client
        // and triggers MessageRepository duplicate-id errors. Mirror the
        // harness's internal `waitForCurrentThreadStreamIdle`.
        while (this.isCurrentThreadStreamActive() || this.getCurrentRunId() !== null) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // After a tool-suspension is resumed via `handleToolResume`, the
        // harness's long-lived `processSubscribedThreadStream` subscription is
        // wedged: `handleToolResume` consumes the resumed output through a
        // SEPARATE `processStream` call (not via the subscription), so the
        // subscription's per-subscriber `seenRunIds` set still has the
        // original runId — and once that run's stream closes, the iterator
        // does not start picking up the next user-message run.
        // Symptom: on the NEXT turn after any ask_env_vars-style flow, the
        // model emits `tool-call-suspended` for the new tool call but the
        // harness never sets `pendingSuspensionRunId` (because the chunk
        // never reaches `processSubscribedThreadStream`) — so the next
        // `respondToToolSuspension` is a silent no-op.
        // Forcing a cleanup here makes `sendSignal` create a fresh
        // subscription for this turn.
        if (typeof (this as any).cleanupAgentThreadSubscription === 'function') {
            (this as any).cleanupAgentThreadSubscription();
        }

        const resourceId = this.resourceId;

        const fullStream = ReadableStream.from((async function* () {
            // `subscribeToThread` filters re-notifications by a local
            // `seenRunIds` set, and `resumeStream` re-registers the
            // suspended run under the SAME runId — so resumed chunks never
            // reach the original subscriber. Plus, `suspend()` pauses but
            // does not close the run's output stream, so the for-await
            // would hang forever after `tool-call-suspended`. Workaround:
            // explicitly break on suspend and resubscribe with a fresh
            // `seenRunIds`.
            //
            // `finish` is always terminal within a run — harness's
            // processStream breaks on whichever of {finish, tool-call-suspended,
            // error, abort} arrives first, so we can't see `finish` after
            // a suspension in the same run. Earlier this guard checked
            // `displayState.pendingSuspension`, but that snapshot races
            // with the harness's `emit("agent_start")` on resume and could
            // leave the loop waiting forever for a chunk that never comes.
            while (true) {
                const sub = await agent.subscribeToThread({ resourceId, threadId });
                let terminal = false;
                let suspended = false;
                try {
                    for await (const chunk of sub.stream) {
                        yield chunk;
                        const t = (chunk as { type?: string })?.type;
                        if (t === 'error' || t === 'abort') { terminal = true; break; }
                        if (t === 'tool-call-suspended') { suspended = true; break; }
                        if (t === 'finish') { terminal = true; break; }
                    }
                } finally {
                    sub.unsubscribe();
                }
                if (terminal || !suspended) return;
            }
        })());

        this.sendMessage(params).catch((err: unknown) => {
            console.error("sendMessage failed", err);
        });

        return { fullStream } as unknown as MastraModelOutput;
    };
}
