import {MCPClient} from "@mastra/mcp";
import {Agent} from "@mastra/core/agent";
import {getAgentModel} from "../providers";
import {createAgentMemory} from "../memory";
import {readdirSync} from "fs";
import {homedir} from "os";
import {join} from "path";
import {execSync} from "child_process";
import {getLocalFilePath, getLocalFileUrl} from "../files";

function resolveChromiumPath(): string | undefined {
    const platform = process.platform;
    const home = homedir();

    const cacheDir = platform === "win32"
        ? join(process.env.USERPROFILE ?? home, "AppData", "Local", "ms-playwright")
        : platform === "darwin"
            ? join(home, "Library", "Caches", "ms-playwright")
            : join(home, ".cache", "ms-playwright");

    const executable = platform === "win32"
        ? join("chrome-headless-shell-win64", "chrome-headless-shell.exe")
        : platform === "darwin"
            ? join("chrome-headless-shell-mac-arm64", "chrome-headless-shell")
            : join("chrome-headless-shell-linux64", "chrome-headless-shell");

    try {
        const shellDir = readdirSync(cacheDir).find(d => d.startsWith("chromium_headless_shell-"));
        if (shellDir) {
            return join(cacheDir, shellDir, executable);
        }
    } catch {
        // cache dir not found
    }

    try {
        execSync("npx -y playwright@1.57.0 install chromium-headless-shell", {stdio: "inherit"});
        const shellDir = readdirSync(cacheDir).find(d => d.startsWith("chromium_headless_shell-"));
        if (shellDir) {
            return join(cacheDir, shellDir, executable);
        }
    } catch {
        // installation failed, let playwright handle it at runtime
    }
    return undefined;
}

const chromiumPath = resolveChromiumPath();

const mcp = new MCPClient({
    id: "playwright-mcp",
    servers: {
        playwright: {
            command: "npx",
            args: ["-y", "@executeautomation/playwright-mcp-server"],
            env: {
                ...(chromiumPath ? {CHROME_EXECUTABLE_PATH: chromiumPath} : {}),
            },
        },
    },
});

export const webBrowserAgent = new Agent({
    id: "web-browser-agent",
    name: "Web Browser Agent",
    description: "Performs actions in headless browser - navigates to any websites, clicks any buttons and links, takes screenshots, fills forms and etc. Screenshots are returned as a relative web URL - do not append 'sandbox:' to it, compose markdown image link instead. Use this agent if you need to take website screenshots, discover UX, make some actions on website, get some info from website.",
    instructions: `You are a browser automation agent with access to Playwright tools. You can navigate websites, interact with page elements, fill forms, click buttons, take screenshots, and extract information from web pages.

When given a task:
1. Use the available Playwright tools to control a browser and complete the task
2. Navigate to URLs, interact with elements, and extract data as needed
3. Handle errors gracefully and retry actions when appropriate
4. Provide clear summaries of what actions were taken and what was found

If you take a screenshot - pass "downloadsDir" arg = "${getLocalFilePath("screenshots")}".
If you have to show screenshot to user - compose markdown image link with URL like "${getLocalFileUrl("screenshots/filename.png")}"

Make all operations automatically from start to end to solve the task and return only final result.
Do not ask user for each step. Accept all cookies.
`,

    model: getAgentModel("general"),
    tools: await mcp.listTools(),
    memory: createAgentMemory(),
});