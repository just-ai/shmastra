import { createMastraCode } from 'mastracode'
import * as fs from 'fs'
import * as path from 'path'

import { OBSERVER_MODELS, DEVELOPER_MODELS, findAvailableModel } from '../providers'
import {Config} from "@mastra/core/mastra";
import {MastraModelOutput} from "@mastra/core/stream";
import {Harness} from "@mastra/core/harness";
import {RequestContext} from "@mastra/core/request-context";
import {TracingContext, TracingOptions} from "@mastra/core/observability";
import {findProjectRoot, getStorageDir, getWorkdir} from "../files";
import {copyProjectToWorkdir, copyWorkdirToProject} from "./sync";
import {patchInstructions} from "./instructions";
import {createApplyChangesTool} from "./tools/apply-changes";
import {createAskEnvVarsTool} from "./tools/ask-env-vars-args";
import {updateEnvContent} from "./env-file";
import {ShmastraCode, ShmastraHarness, ShmastraProvider} from "./types";
import {queryDocumentsTool} from "../rag";
import {Agent} from "@mastra/core/agent";
import {mastraClientAgent} from "../client";
import {searchMcpServersTool} from "../mcp/tools";
import {deduplicateItemIds} from "../utils";
import connections from "../connections";
import {connectToolkitTool, executeToolkitTool, getToolSchemaTool, searchToolkitsTool} from "../connections/tools";
import {isDryRun} from "../env";

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
    const projectRoot = findProjectRoot();
    const cwd = isDryRun ? projectRoot : await copyProjectToWorkdir();
    const provider = new ShmastraProviderImpl();

    const omModelId = findAvailableModel(OBSERVER_MODELS);
    const connectionsTools = {};
    if (connections.isConnected()) {
        Object.assign(connectionsTools, {
            search_toolkits: searchToolkitsTool,
            get_toolkit_tool_schema: getToolSchemaTool,
            execute_toolkit_tool: executeToolkitTool,
            connect_toolkit: connectToolkitTool(provider),
        });
    }

    const { harness, authStorage, ...code } = await createMastraCode({
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
            ask_env_vars_safely: createAskEnvVarsTool(provider),
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
    await initModels(sh);

    return { ...code, authStorage, harness: sh };
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
    installSetEnvVars(harness);
    installConnectionStatus(harness);
    restrictSkillPaths(harness);
    filterTools(harness);
}

function restrictSkillPaths(harness: ShmastraHarness) {
    const originalWorkspaceFn = (harness as any).workspaceFn;
    if (typeof originalWorkspaceFn !== 'function') return;

    const allowedSkillPaths = [path.join(process.cwd(), '.mastracode', 'skills')];

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
            prepareStep: async (args) => {
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
        if (applyChanges && event.type === "agent_end") {
            applyChanges = false;
            copyWorkdirToProject().catch((err) => console.error(err));
        }
    });

    harness.applyChanges = () => {
        applyChanges = true;
    }
}

function installSetEnvVars(harness: ShmastraHarness) {
    const envPath = path.resolve(getWorkdir(), '.env');
    const promise = {
        resolve: (vars: string[]) => {},
        reject: (err: unknown) => {},
    }

    harness.subscribe(event => {
       if (event.type === 'agent_end') {
           promise.reject("agent_end");
       }
    });

    harness.askEnvVars = input => {
        return new Promise((resolve, reject) => {
            promise.resolve = resolve;
            promise.reject = reject;
        });
    }

    harness.setEnvVars = vars => {
        const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        fs.writeFileSync(envPath, updateEnvContent(existing, vars), 'utf-8');
        for (const [k, v] of Object.entries(vars)) {
            if (v != null) process.env[k] = String(v);
        }
        promise.resolve(Object.keys(vars));
    }
}

function installConnectionStatus(harness: ShmastraHarness) {
    const connections: Record<string, {
        resolve: () => void,
        reject: (err: any) => void,
    }> = {}

    harness.subscribe(event => {
        if (event.type === 'agent_end') {
            Object.values(connections).forEach(({resolve, reject}) => {
                reject("agent_end");
            });
            Object.assign(connections, {});
        }
    });

    harness.awaitConnectionAuth = (toolkit: string) => {
        return new Promise((resolve, reject) => {
            connections[toolkit] = {resolve, reject};
        });
    }

    harness.completeConnectionAuth = (toolkit: string) => {
        connections[toolkit]?.resolve();
        delete connections[toolkit];
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
    harness.streamMessage = async function (params: {
        content: string;
        files?: Array<{ data: string; mediaType: string; filename?: string }>;
        tracingContext?: TracingContext;
        tracingOptions?: TracingOptions;
        requestContext?: RequestContext;
    }): Promise<MastraModelOutput> {
        const originalProcessStream: Function =
            Object.getPrototypeOf(this).processStream;

        let resolveResponse!: (response: MastraModelOutput) => void;
        let rejectResponse!: (err: unknown) => void;
        const responsePromise = new Promise<MastraModelOutput>(
            (resolve, reject) => {
                resolveResponse = resolve;
                rejectResponse = reject;
            },
        );

        this.processStream = function (response: MastraModelOutput, requestContext: RequestContext) {
            // ReadableStream has a native .tee() method
            const [branchInternal, branchExternal] = response.fullStream.tee();

            // Return the full response to the caller, with the external branch
            resolveResponse({
                ...response,
                fullStream: branchExternal,
            } as MastraModelOutput);

            // Remove instance override, restore prototype method
            delete this.processStream;

            // Call original processStream with the internal branch
            return originalProcessStream.call(this, {
                ...response,
                fullStream: branchInternal,
            }, requestContext);
        };

        this.sendMessage(params).catch((err: unknown) => {
            rejectResponse(err);
        });

        return responsePromise;
    };
}
