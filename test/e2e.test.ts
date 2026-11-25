import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";

const repoRoot = path.join(__dirname, "..", "..");

test("demo: one claim proves end to end in the real Sprite", { timeout: 180_000 }, () => {
  const run = spawnSync(
    process.execPath,
    ["dist/src/cli.js", "check", "examples/CLAIMS.md"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(run.status, 0, `cli exited ${run.status}: ${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /demo-claim/i);
  assert.match(run.stdout, /proven/i);
  assert.match(run.stdout, /1 proven, 0 owed/i);
});
