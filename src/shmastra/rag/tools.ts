import {createTool} from "@mastra/core/tools";
import {z} from "zod";
import {convertFileToMarkdown} from "./markitdown";
import {Agent} from "@mastra/core/agent";
import {getAvailableModel} from "../providers";
import {resolveFileUrl} from "../files";

const MAX_MD_LENGTH = 200_000;

const IMAGE_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg',
]);

const MARKITDOWN_EXTENSIONS = new Set([
    'pdf', 'docx', 'pptx', 'xlsx', 'xls',
    'html', 'htm', 'csv', 'json', 'jsonl', 'xml',
    'txt', 'text', 'md', 'markdown',
    'mp3', 'wav',
    'zip', 'epub', 'msg',
]);

const SUPPORTED_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...MARKITDOWN_EXTENSIONS]);

function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() ?? '';
}

function isImageFile(filename: string): boolean {
    return IMAGE_EXTENSIONS.has(getFileExtension(filename));
}

function assertSupportedFile(filename: string) {
    const ext = getFileExtension(filename);
    if (!ext || !SUPPORTED_EXTENSIONS.has(ext)) {
        throw new Error(
            `Unsupported file extension ".${ext}" for file "${filename}". ` +
            `Supported extensions: ${[...SUPPORTED_EXTENSIONS].join(', ')}`
        );
    }
}

type QueryDocumentsArgs = {
    files: Array<string>;
    question: string;
}

const AGENT_MODELS = [
    'google/gemini-3-flash-preview',
    'openai/gpt-5.4-mini',
    'anthropic/claude-sonnet-4-6',
];

const docAgent = new Agent({
    id: "docAgent",
    name: "Doc Agent",
    instructions: "Answer question regarding provided document text. Respond only with answer, nothing alse.",
    model: getAvailableModel(AGENT_MODELS),
});

export const queryDocumentsTool = createTool({
    id: "query_documents",
    description: "Query particular document files with natural language question",
    inputSchema: z.object({
        files: z.array(z.string()).describe("Document files to query"),
        question: z.string().describe("Standalone question in natural language"),
    }),
    outputSchema: z.array(z.object({
        file: z.string().describe("Document file name"),
        answer: z.string().describe("Answer to the question based on the document"),
    })),
    execute: (args: QueryDocumentsArgs) =>
        Promise.all(
            args.files.map(async (file) => {
                assertSupportedFile(file);
                const content: any[] = [];

                if (isImageFile(file)) {
                    const imageUrl = await resolveFileUrl(file, `image/${getFileExtension(file)}`);
                    content.push({type: "image", image: imageUrl});
                } else {
                    const markdown = await convertFileToMarkdown(file);
                    const imageUrls = Array.from(markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g))
                        .map(m => m[1])
                        .filter(url => !url.startsWith('data:'));
                    const resolvedImageUrls = await Promise.all(
                        imageUrls.map(url => url.startsWith('http')
                            ? url
                            : resolveFileUrl(url, `image/${url.split('.').pop() ?? 'png'}`)
                        )
                    );
                    content.push(
                        ...resolvedImageUrls.map(url => ({type: "image", image: url})),
                        {type: "text", text: `DOCUMENT:\n\n${markdown.slice(0, MAX_MD_LENGTH)}`},
                    );
                }

                content.push({type: "text", text: `QUESTION: ${args.question}`});

                const response = await docAgent.generate([{
                    role: "user", content
                }]);
                return {file, answer: response.text};
            })
        )
});