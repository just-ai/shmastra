import { execSync } from "child_process";
import { join } from "path";
import { existsSync, readdirSync } from "fs";

// Get global node_modules path where @executeautomation/playwright-mcp-server is installed
const globalRoot = execSync("npm root -g", { encoding: "utf-8" }).trim();
const mcpServerDir = join(globalRoot, "@executeautomation/playwright-mcp-server");

console.log(`Global node_modules: ${globalRoot}`);
console.log(`MCP server dir exists: ${existsSync(mcpServerDir)}`);

if (existsSync(mcpServerDir)) {
    const hasNestedModules = existsSync(join(mcpServerDir, "node_modules"));
    console.log(`MCP server has nested node_modules: ${hasNestedModules}`);
    if (hasNestedModules) {
        console.log(`Nested modules:`, readdirSync(join(mcpServerDir, "node_modules")).filter(d => d.includes("playwright")).join(", "));
    }
    // Check if playwright-core is hoisted to global root
    const hoisted = existsSync(join(globalRoot, "playwright-core"));
    console.log(`playwright-core hoisted to global root: ${hoisted}`);
}

// Try to find playwright-core CLI in all possible locations
const candidates = [
    join(mcpServerDir, "node_modules", "playwright-core", "cli.js"),
    join(globalRoot, "playwright-core", "cli.js"),
    join(mcpServerDir, "node_modules", "playwright", "node_modules", "playwright-core", "cli.js"),
    join(globalRoot, "playwright", "node_modules", "playwright-core", "cli.js"),
];

const playwrightCli = candidates.find(p => existsSync(p));

if (!playwrightCli) {
    console.error("Playwright CLI not found in any of:");
    candidates.forEach(c => console.error(`  ${c} (exists: ${existsSync(c)})`));
    process.exit(1);
}

console.log(`Using Playwright CLI: ${playwrightCli}`);
execSync(`node ${playwrightCli} install --with-deps chromium`, { stdio: "inherit" });
