import assert from "node:assert/strict";
import { test } from "node:test";
import { recallEvidence, storeEvidence } from "../src/pinecone";
import type { ExecResult } from "../src/runner";

function fakeExec(result: ExecResult) {
  const seen: string[] = [];
  return {
    seen,
    exec: async (cmd: string): Promise<ExecResult> => {
      seen.push(cmd);
      return result;
    },
  };
}

function decodeB64Arg(cmd: string, flag: string): string {
  const match = cmd.match(new RegExp(`${flag} ([A-Za-z0-9+/=]+)`));
  assert.ok(match, `command has no ${flag} arg: ${cmd}`);
  return Buffer.from(match[1], "base64").toString("utf8");
}

test("store calls the Sprite helper with the claim id, result and base64 payload", async () => {
  const { seen, exec } = fakeExec({ exit: 0, stdout: '{"stored": "claim-demo-claim"}\n', stderr: "" });
  await storeEvidence(exec, "demo-claim", "demo-claim\nnegative: false\npositive: echo OK", "proven", "OK: fixed input accepted");
  assert.equal(seen.length, 1);
  assert.match(seen[0], /pinecone\.py store/);
  assert.match(seen[0], /--id demo-claim/);
  assert.match(seen[0], /--result proven/);
  assert.equal(
    decodeB64Arg(seen[0], "--text-b64"),
    "demo-claim\nnegative: false\npositive: echo OK",
  );
  assert.equal(decodeB64Arg(seen[0], "--snippet-b64"), "OK: fixed input accepted");
});

test("store throws when the Sprite helper exits non-zero", async () => {
  const { exec } = fakeExec({ exit: 1, stdout: "", stderr: "gateway 401\n" });
  await assert.rejects(() => storeEvidence(exec, "demo-claim", "text", "proven", "OK"));
});

test("recall calls the helper and returns the stored match", async () => {
  const { seen, exec } = fakeExec({
    exit: 0,
    stdout: JSON.stringify({
      match: { id: "claim-demo-claim", result: "proven", score: 0.9999, text: "demo-claim" },
    }),
    stderr: "",
  });
  const prior = await recallEvidence(exec, "demo-claim\nnegative: false\npositive: echo OK");
  assert.equal(seen.length, 1);
  assert.match(seen[0], /pinecone\.py recall/);
  assert.equal(
    decodeB64Arg(seen[0], "--text-b64"),
    "demo-claim\nnegative: false\npositive: echo OK",
  );
  assert.ok(prior);
  assert.equal(prior.id, "claim-demo-claim");
  assert.equal(prior.result, "proven");
  assert.equal(prior.score, 0.9999);
});

test("recall returns null when nothing was stored before", async () => {
  const { exec } = fakeExec({ exit: 0, stdout: '{"match": null}\n', stderr: "" });
  const prior = await recallEvidence(exec, "demo-claim\nnegative: false\npositive: echo OK");
  assert.equal(prior, null);
});

test("recall throws when the Sprite helper exits non-zero", async () => {
  const { exec } = fakeExec({ exit: 1, stdout: "", stderr: "gateway 401\n" });
  await assert.rejects(() => recallEvidence(exec, "demo-claim"));
});
