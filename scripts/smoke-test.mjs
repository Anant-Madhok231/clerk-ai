#!/usr/bin/env node
// Boots the packaged Electron main process headlessly, seeds Demo Mode
// through the real SQLite + agent pipeline, and prints a one-line summary.
// Used in CI (see .github/workflows/ci.yml) to catch main-process crashes
// that a pure TypeScript build wouldn't - e.g. a native module built
// against the wrong Node ABI, or a broken IPC handler registration.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const desktopDir = path.resolve(fileURLToPath(import.meta.url), "../../apps/desktop");
const electronBin = path.join(desktopDir, "node_modules/.bin/electron");
const rootElectronBin = path.resolve(desktopDir, "../../node_modules/.bin/electron");
const bin = fs.existsSync(electronBin) ? electronBin : rootElectronBin;

const isLinux = os.platform() === "linux";
const args = isLinux
  ? ["xvfb-run", "-a", bin, "out/main/index.js", "--no-sandbox", "--disable-gpu"]
  : [bin, "out/main/index.js"];

const result = spawnSync(args[0], args.slice(1), {
  cwd: desktopDir,
  env: { ...process.env, CLERK_SMOKE_TEST: "1" },
  encoding: "utf-8",
});

const lastJsonLine = result.stdout
  .trim()
  .split("\n")
  .reverse()
  .find((line) => line.trim().startsWith("{"));

if (!lastJsonLine) {
  console.error(result.stdout);
  console.error(result.stderr);
  console.error("Smoke test failed: no summary JSON printed.");
  process.exit(1);
}

const summary = JSON.parse(lastJsonLine);
console.log("Clerk smoke test:", summary);

if (summary.needsAttention < 1 || summary.waiting < 1 || summary.recentlyCompleted < 1) {
  console.error("Smoke test failed: demo dashboard did not match expected shape.");
  process.exit(1);
}

console.log("Smoke test passed.");
