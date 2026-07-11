const { spawn } = require("child_process");
const electronPath = require("electron");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const extraArgs = process.argv.includes("--debug-time") ? ["--debug-time"] : [];
const child = spawn(electronPath, [".", ...extraArgs], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
  windowsHide: false,
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});
