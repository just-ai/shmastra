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

// Check if chromium is already installed
try {
    if (readdirSync(cacheDir).some(d => d.startsWith("chromium-"))) {
        console.log("Chromium already installed in", cacheDir);
        process.exit(0);
    }
} catch {
    // cache dir not found, need to install
}

console.log("Installing Chromium browser...");
execSync("npx playwright install chromium", { stdio: "inherit" });

// Verify
const installed = readdirSync(cacheDir).find(d => d.startsWith("chromium-"));
if (installed) {
    console.log("Chromium installed:", join(cacheDir, installed));
} else {
    console.error("Chromium not found after installation in", cacheDir);
    process.exit(1);
}
