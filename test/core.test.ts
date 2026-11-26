import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";

const repoRoot = path.join(__dirname, "..", "..");

function runCli() {
  return spawnSync(process.execPath, ["dist/src/cli.js", "check", "examples/CLAIMS.md"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("core: four claims prove, and the second run recalls the stored evidence", { timeout: 300_000 }, () => {
  const first = runCli();
  assert.equal(first.status, 0, `first run exited ${first.status}: ${first.stdout}\n${first.stderr}`);
  assert.match(first.stdout, /4 proven, 0 owed/i);

  const second = runCli();
  assert.equal(second.status, 0, `second run exited ${second.status}: ${second.stdout}\n${second.stderr}`);
  assert.match(second.stdout, /4 proven, 0 owed/i);
  assert.match(second.stdout, /seen before: proven/i);
});
