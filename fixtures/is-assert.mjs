// Behavioral check for @sindresorhus/is: imports the repo's real source
// (Node type-stripping handles the .ts, no install needed) and asserts its
// public API the way the repo's own tests do. Usage:
//   node /home/sprite/fixtures/is-assert.mjs <path-to-cloned-is-repo>
import assert from 'node:assert/strict';

const repo = process.argv[2];
if (!repo) {
  console.error('usage: is-assert.mjs <path-to-cloned-is-repo>');
  process.exit(2);
}
const {default: is} = await import(`${repo}/source/index.ts`);

assert.equal(is.string('x'), true);
assert.equal(is.string(1), false);
assert.equal(is.number(1), true);
assert.equal(is.number(Number.NaN), false);
assert.equal(is.plainObject({}), true);
assert.equal(is.plainObject([]), false);
assert.equal(is.array([]), true);
assert.equal(is.boolean(true), true);
assert.equal(is.emptyString(''), true);
assert.equal(is.nonEmptyString('a'), true);
console.log('is-assert OK');
