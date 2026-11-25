import assert from "node:assert/strict";
import { test } from "node:test";
import { parseClaims } from "../src/claims";

test("parses one claim with a negative and a positive command", () => {
  const text = [
    "## demo-claim",
    "negative: sh /home/sprite/fixtures/demo-broken.sh",
    "positive: sh /home/sprite/fixtures/demo-fixed.sh",
    "",
  ].join("\n");
  const claims = parseClaims(text);
  assert.equal(claims.length, 1);
  assert.equal(claims[0].id, "demo-claim");
  assert.equal(claims[0].negative, "sh /home/sprite/fixtures/demo-broken.sh");
  assert.equal(claims[0].positive, "sh /home/sprite/fixtures/demo-fixed.sh");
});

test("parses two claims in file order", () => {
  const text = [
    "## first",
    "negative: exit 1",
    "positive: exit 0",
    "## second",
    "negative: exit 2",
    "positive: exit 0",
    "",
  ].join("\n");
  const claims = parseClaims(text);
  assert.deepEqual(
    claims.map((c) => c.id),
    ["first", "second"],
  );
});

test("throws on a claim missing its positive command", () => {
  const text = ["## lonely", "negative: exit 1", ""].join("\n");
  assert.throws(() => parseClaims(text), /lonely.*positive|positive.*lonely/);
});

test("throws on a duplicate claim id", () => {
  const text = [
    "## dup",
    "negative: exit 1",
    "positive: exit 0",
    "## dup",
    "negative: exit 1",
    "positive: exit 0",
    "",
  ].join("\n");
  assert.throws(() => parseClaims(text), /dup/);
});

test("ignores # comment lines and blank lines", () => {
  const text = [
    "# Demo claims for Proof or It Didn't Happen",
    "",
    "## demo-claim",
    "# the broken input must fail",
    "negative: exit 1",
    "positive: exit 0",
    "",
  ].join("\n");
  const claims = parseClaims(text);
  assert.equal(claims.length, 1);
  assert.equal(claims[0].id, "demo-claim");
});
