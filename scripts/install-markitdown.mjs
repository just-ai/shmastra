import {spawnSync} from "child_process";

const check = spawnSync("markitdown", ["--help"], {stdio: "ignore"});
if (check.status === 0) {
    process.exit(0);
}

const attempts = [
    ["pipx", ["install", "markitdown[all]"]],
    ["pip3", ["install", "--user", "markitdown[all]"]],
    ["pip3", ["install", "markitdown[all]"]],
    ["pip3", ["install", "--break-system-packages", "--user", "markitdown[all]"]],
    ["pip3", ["install", "--break-system-packages", "markitdown[all]"]],
];

for (const [cmd, args] of attempts) {
    const probe = spawnSync(cmd, ["--version"], {stdio: "ignore"});
    if (probe.error || probe.status !== 0) continue;
    const result = spawnSync(cmd, args, {stdio: "inherit"});
    if (result.status === 0) {
        process.exit(0);
    }
}

console.error(
    "[install-markitdown] Failed to install markitdown. " +
    "Tried pipx and pip3 (including --user and --break-system-packages). " +
    "Install it manually (e.g. `pipx install 'markitdown[all]'`) and retry."
);
process.exit(1);
