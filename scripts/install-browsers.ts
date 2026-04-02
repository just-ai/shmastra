import { execSync } from "child_process";
import { join } from "path";
import { readdirSync } from "fs";
import { homedir } from "os";

const home = homedir();
const cacheDir = process.platform === "win32"
    ? join(process.env.USERPROFILE ?? home, "AppData", "Local", "ms-playwright")
    : process.platform === "darwin"
        ? join(home, "Library", "Caches", "ms-playwright")
        : join(home, ".cache", "ms-playwright");

// Check if chromium headless shell is already installed
try {
    if (readdirSync(cacheDir).some(d => d.startsWith("chromium_headless_shell-"))) {
        console.log("Chromium Headless Shell already installed in", cacheDir);
        process.exit(0);
    }
} catch {
    // cache dir not found, need to install
}

console.log("Installing Chromium Headless Shell...");
// Use the same playwright version as @executeautomation/playwright-mcp-server
// to ensure chromium revision matches what the MCP server expects at runtime
execSync("npx -y playwright@1.57.0 install chromium-headless-shell", { stdio: "inherit" });

// Verify
const installed = readdirSync(cacheDir).find(d => d.startsWith("chromium_headless_shell-"));
if (installed) {
    console.log("Chromium Headless Shell installed:", join(cacheDir, installed));
} else {
    console.error("Chromium Headless Shell not found after installation in", cacheDir);
    process.exit(1);
}
