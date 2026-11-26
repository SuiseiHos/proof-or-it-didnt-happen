import assert from "node:assert/strict";
import { test } from "node:test";
import { spriteConfig } from "../src/sprite";

test("spriteConfig defaults to the author's org and Sprite", () => {
  delete process.env.SPRITE_ORG;
  delete process.env.SPRITE_NAME;
  assert.deepEqual(spriteConfig(), {
    org: "aldantus23-gmail-com",
    name: "proof-or-it-didnt-happen",
  });
});

test("spriteConfig honors SPRITE_ORG and SPRITE_NAME", () => {
  process.env.SPRITE_ORG = "someone-else";
  process.env.SPRITE_NAME = "their-sprite";
  try {
    assert.deepEqual(spriteConfig(), { org: "someone-else", name: "their-sprite" });
  } finally {
    delete process.env.SPRITE_ORG;
    delete process.env.SPRITE_NAME;
  }
});
