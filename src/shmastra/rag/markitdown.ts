import {spawnSync} from "child_process";
import {writeFileSync, readFileSync, mkdirSync, createReadStream, createWriteStream, renameSync, existsSync} from "fs";
import {createInterface} from "readline";
import {join, basename} from "path";
import {getImageDimensions, MIN_IMAGE_SIZE} from "./images";

interface MarkitdownOptions {
    args?: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}

function runMarkitdown(input?: string, options: MarkitdownOptions = {}): string {
    const {args = [], cwd, env} = options;

    const cmdArgs = [...args];
    if (input) {
        cmdArgs.push(input);
    }

    const result = spawnSync("markitdown", cmdArgs, {
        cwd,
        env: env ?? process.env,
        encoding: "utf-8",
    });

    if (result.error) {
        throw new Error(`Failed to start markitdown: ${result.error.message}`);
    }
    if (result.status !== 0) {
        throw new Error(`markitdown exited with code ${result.status}: ${result.stderr}`);
    }

    return result.stdout;
}

/**
 * Converts a file from files/<filename> to markdown using markitdown,
 * extracts embedded base64 images to files/images/, and returns the markdown content.
 */
export async function convertFileToMarkdown(filename: string): Promise<string> {
    const name = basename(filename);
    const filesDir = join(process.cwd(), "files");
    const imagesDir = join(filesDir, "images");
    const inputPath = join(filesDir, name);
    const outputPath = join(filesDir, `${name}.md`);
    const tmpPath = `${outputPath}.tmp`;

    if (existsSync(outputPath)) {
        return readFileSync(outputPath, "utf-8");
    }

    mkdirSync(imagesDir, {recursive: true});

    runMarkitdown(inputPath, {args: ["--keep-data-uris", "-o", outputPath]});

    const imageCounters: Record<string, number> = {};
    const imageRegex = /!\[([^\]]*)\]\(data:image\/(\w+);base64,([^)]+)\)/g;

    await new Promise<void>((resolve, reject) => {
        const rl = createInterface({input: createReadStream(outputPath), crlfDelay: Infinity});
        const out = createWriteStream(tmpPath);

        rl.on("line", (line) => {
            const processed = line.replace(imageRegex, (match, alt, ext, b64) => {
                const buf = Buffer.from(b64, "base64");
                const dims = getImageDimensions(buf, ext);
                if (!dims || dims.width < MIN_IMAGE_SIZE || dims.height < MIN_IMAGE_SIZE) {
                    return match;
                }
                imageCounters[ext] = (imageCounters[ext] ?? 0) + 1;
                const imageName = `${name}-${imageCounters[ext]}.${ext}`;
                writeFileSync(join(imagesDir, imageName), buf);
                return `![${alt}](images/${imageName})`;
            });
            out.write(processed + "\n");
        });

        rl.on("close", () => out.end());
        out.on("finish", resolve);
        rl.on("error", reject);
        out.on("error", reject);
    });

    renameSync(tmpPath, outputPath);

    // Read back the processed file — now without base64 blobs it's small
    return readFileSync(outputPath, "utf-8");
}
