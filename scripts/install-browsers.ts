import { execSync } from "child_process";
import { join } from "path";
import { existsSync } from "fs";

// Get global node_modules path where @executeautomation/playwright-mcp-server is installed
const globalRoot = execSync("npm root -g", { encoding: "utf-8" }).trim();
const mcpServerDir = join(globalRoot, "@executeautomation/playwright-mcp-server");

// Use playwright-core CLI from MCP server's dependencies
// to ensure browser version matches what the MCP server expects at runtime
const playwrightCli = join(mcpServerDir, "node_modules", "playwright-core", "cli.js");

if (!existsSync(playwrightCli)) {
    console.warn(`Playwright CLI not found at ${playwrightCli}, skipping browser installation.`);
    console.warn("Make sure @executeautomation/playwright-mcp-server is installed globally.");
    process.exit(0);
}

execSync(`node ${playwrightCli} install --with-deps chromium`, { stdio: "inherit" });
