import {spawnSync} from "child_process";

const check = spawnSync("markitdown", ["--help"], {stdio: "ignore"});
if (check.status !== 0) {
    const install = spawnSync("pip3", ["install", "markitdown[all]"], {stdio: "inherit"});
    if (install.status !== 0) {
        process.exit(install.status ?? 1);
    }
}
