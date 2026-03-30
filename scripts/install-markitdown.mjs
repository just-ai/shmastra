import {spawnSync} from "child_process";

function run(args) {
    return spawnSync("uv", args, {stdio: "inherit"});
}

const install = run(["tool", "install", "markitdown"]);
if (install.status !== 0) {
    const upgrade = run(["tool", "upgrade", "markitdown"]);
    if (upgrade.status !== 0) {
        process.exit(upgrade.status ?? 1);
    }
}
