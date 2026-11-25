import assert from "node:assert/strict";
import { test } from "node:test";
import { checkClaim, type ExecResult } from "../src/runner";
import type { Claim } from "../src/claims";

const claim: Claim = {
  id: "demo-claim",
  negative: "sh /home/sprite/fixtures/demo-broken.sh",
  positive: "sh /home/sprite/fixtures/demo-fixed.sh",
};

function fakeExec(results: Record<string, ExecResult>) {
  const seen: string[] = [];
  return {
    seen,
    exec: async (cmd: string): Promise<ExecResult> => {
      seen.push(cmd);
      const result = results[cmd];
      if (result === undefined) throw new Error(`unexpected command: ${cmd}`);
      return result;
    },
  };
}

test("proven when the negative test fails and the positive test passes with output", async () => {
  const { exec } = fakeExec({
    [claim.negative]: { exit: 3, stdout: "BROKEN: bad input rejected\n", stderr: "" },
    [claim.positive]: { exit: 0, stdout: "OK: fixed input accepted\n", stderr: "" },
  });
  const result = await checkClaim(claim, exec);
  assert.equal(result.verdict, "proven");
  assert.equal(result.negativeExit, 3);
  assert.equal(result.positiveExit, 0);
});

test("runs the negative test before the positive test", async () => {
  const { seen, exec } = fakeExec({
    [claim.negative]: { exit: 1, stdout: "", stderr: "" },
    [claim.positive]: { exit: 0, stdout: "OK\n", stderr: "" },
  });
  await checkClaim(claim, exec);
  assert.deepEqual(seen, [claim.negative, claim.positive]);
});

test("owed when the negative test passes (broken input did not fail)", async () => {
  const { exec } = fakeExec({
    [claim.negative]: { exit: 0, stdout: "OK\n", stderr: "" },
    [claim.positive]: { exit: 0, stdout: "OK\n", stderr: "" },
  });
  const result = await checkClaim(claim, exec);
  assert.equal(result.verdict, "owed");
  assert.match(result.reason, /negative/i);
});

test("owed when the positive test fails", async () => {
  const { exec } = fakeExec({
    [claim.negative]: { exit: 1, stdout: "", stderr: "" },
    [claim.positive]: { exit: 2, stdout: "", stderr: "boom\n" },
  });
  const result = await checkClaim(claim, exec);
  assert.equal(result.verdict, "owed");
  assert.match(result.reason, /positive/i);
});

test("owed when the positive test passes but prints nothing", async () => {
  const { exec } = fakeExec({
    [claim.negative]: { exit: 1, stdout: "", stderr: "" },
    [claim.positive]: { exit: 0, stdout: "   \n", stderr: "" },
  });
  const result = await checkClaim(claim, exec);
  assert.equal(result.verdict, "owed");
  assert.match(result.reason, /empty/i);
});
