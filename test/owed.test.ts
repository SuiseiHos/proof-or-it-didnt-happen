import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const repoRoot = path.join(__dirname, "..", "..");

// The auditor's scratch probe, committed as a regression test: three owed
// shapes (negative passes, positive fails silently, positive prints
// nothing) plus one proven claim. Before the D1 fix the run crashed at
// the second claim's store step and printed no verdict table at all.
const OWED_CLAIMS = `# owed-shapes probe
## audit-neg-passes
negative: true
positive: echo OK

## audit-pos-fails
negative: false
positive: false

## audit-pos-empty
negative: false
positive: true

## audit-proper
negative: false
positive: echo OK
`;

test("owed: silent positives still print a verdict table", { timeout: 240_000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proof-owed-"));
  const claimsPath = path.join(dir, "CLAIMS.md");
  fs.writeFileSync(claimsPath, OWED_CLAIMS);
  const run = spawnSync(
    process.execPath,
    ["dist/src/cli.js", "check", claimsPath],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(run.status, 1, `cli exited ${run.status}: ${run.stdout}\n${run.stderr}`);
  assert.doesNotMatch(run.stdout, /could not store evidence/);
  assert.match(run.stdout, /audit-neg-passes\s+OWED/);
  assert.match(run.stdout, /audit-pos-fails\s+OWED/);
  assert.match(run.stdout, /audit-pos-empty\s+OWED/);
  assert.match(run.stdout, /audit-proper\s+PROVEN/);
  assert.match(run.stdout, /1 proven, 3 owed\./);
});
