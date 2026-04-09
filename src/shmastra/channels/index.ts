import type {
    ChannelAdapterConfig,
    ChannelConfig,
    ChannelHandler,
    ChannelHandlerConfig,
    ChannelHandlers
} from "@mastra/core/channels";
import {Attachment} from "chat";
import {downloadFile, resolveFileUrl} from "../files";
import {nanoid} from "nanoid";
import {fixTelegramMarkdownV1, resolveRelativeUrls} from "./utils";

const FILE_TYPE_EXT: Record<Attachment["type"], string> = {
    image: ".jpg",
    file: ".bin",
    video: ".mp4",
    audio: ".ogg",
};

const handlerKeys: (keyof ChannelHandlers)[] = ["onDirectMessage", "onMention", "onSubscribedMessage"];

export function createAgentChannels(config: ChannelConfig) {
    const userHandlers = config.handlers ?? {};
    config.handlers = Object.fromEntries(
        handlerKeys.map(key => {
            const userHandler = userHandlers[key];
            // User explicitly disabled this handler — respect that
            if (userHandler === false) return [key, false];
            return [key, wrapHandler(channelHandler, userHandler)];
        })
    );

    if (config.adapters) {
        config.adapters = Object.fromEntries(
            Object.entries(config.adapters).map(([key, value]) => {
                const isConfig = value && typeof value === "object" && "adapter" in value;
                return [
                    key,
                    {
                        ...(isConfig ? value : {}),
                        adapter: isConfig ? (value as any).adapter : value,
                        formatToolCall: (isConfig && (value as any).formatToolCall) || (() => null),
                    } as ChannelAdapterConfig,
                ];
            })
        );
    }

    return config;
}

/**
 * Compose our wrapper around an optional user handler.
 * Chain: our wrapper patches thread → user handler (if any) → defaultHandler.
 */
function wrapHandler(
    wrapper: ChannelHandler,
    userHandler?: ChannelHandlerConfig,
): ChannelHandler {
    if (!userHandler) return wrapper;
    return (thread, message, defaultHandler) =>
        wrapper(thread, message, (t, m) => userHandler(t, m, defaultHandler));
}

const channelHandler: ChannelHandler = async (thread, message, defaultHandler) => {
    if (message.text) {
        return handleTextMessage(thread, message, defaultHandler);
    } else if (message.attachments.length) {
        return handleAttachments(thread, message, defaultHandler);
    }
}

const handleAttachments: ChannelHandler = async (thread, message) => {
    const attachments: Attachment[] = await Promise.all(
        message.attachments.map(async (a): Promise<Attachment> => {
            const data = a.data
                ? Buffer.isBuffer(a.data) ? a.data : Buffer.from(await a.data.arrayBuffer())
                : a.fetchData ? await a.fetchData()
                : undefined;
            const name = data
                ? downloadFile(a.name ?? `${thread.channelId}-${nanoid(4)}${FILE_TYPE_EXT[a.type]}`, data)
                : a.name;
            return {
                ...a,
                name,
                type: a.type === "image" ? "image" : "file",
            };
        })
    );
    const state = await thread.state;
    await thread.setState({
        attachments: attachments.concat(state?.attachments as Attachment[] || []),
    });
}

const handleTextMessage: ChannelHandler = async (thread, message, defaultHandler) => {
    if (message.attachments.length) {
        await handleAttachments(thread, message, defaultHandler);
    }

    const state = await thread.state;
    message.attachments = await Promise.all(
        ((state?.attachments as Attachment[] || []).map(async (a) => {
            if (a.type === "image" && a.name) {
                return {...a, url: await resolveFileUrl(a.name)};
            }
            return a;
        }))
    );

    if (message.text && message.attachments.length) {
        message.attachments
            .filter(a => a.url?.startsWith("http"))
            .forEach(a => { message.text += `\n\n${a.url}` });
    }

    message.attachments = message.attachments
        .filter(a => !a.url?.startsWith("http"));

    const post = thread.post.bind(thread);
    thread.post = async (message) => {
        if ((message as any).type === "card") {
            const children = (message as any).children as any[];
            const hasToolCall = children?.some(
                (c: any) => c.type === "text" && /^\*\w+\*\s*`\[/.test(c.content)
            );
            if (hasToolCall) return undefined as any;
        }

        await thread.setState({ attachments: [] });

        if (typeof message === "string") {
            message = resolveRelativeUrls(message);
            message = fixTelegramMarkdownV1(message);
        }
        try {
            return await post(typeof message === "string" ? { markdown: message } : message);
        } catch (e) {
            if (typeof message === "string") {
                return await post(message);
            }
            throw e;
        }
    }

    return defaultHandler(thread, message);
}
