# Proof or It Didn't Happen — demo claims
# The demo leads with two real public repos, cloned fresh inside the Sprite
# on every run (no install needed: chalk vendors its deps and runs node:test;
# is is checked by fixtures/is-assert.mjs via Node type-stripping).
# The two seeded claims at the end show the mechanism on tiny fixtures.

## real-chalk
negative: rm -rf /home/sprite/targets/chalk && git clone -q --depth 1 https://github.com/chalk/chalk.git /home/sprite/targets/chalk && cd /home/sprite/targets/chalk && sed -i 's/createStyler(style.open, style.close/createStyler(style.close, style.open/' source/index.js && node --test test/chalk.js test/instance.js test/visible.js test/no-color-support.js
positive: rm -rf /home/sprite/targets/chalk && git clone -q --depth 1 https://github.com/chalk/chalk.git /home/sprite/targets/chalk && cd /home/sprite/targets/chalk && node --test test/chalk.js test/instance.js test/visible.js test/no-color-support.js

## real-is
negative: rm -rf /home/sprite/targets/is && git clone -q --depth 1 https://github.com/sindresorhus/is.git /home/sprite/targets/is && sed -i "s/typeof value === 'string'/typeof value !== 'string'/" /home/sprite/targets/is/source/index.ts && node /home/sprite/fixtures/is-assert.mjs /home/sprite/targets/is
positive: rm -rf /home/sprite/targets/is && git clone -q --depth 1 https://github.com/sindresorhus/is.git /home/sprite/targets/is && node /home/sprite/fixtures/is-assert.mjs /home/sprite/targets/is

## demo-claim
negative: sh /home/sprite/fixtures/demo-broken.sh
positive: sh /home/sprite/fixtures/demo-fixed.sh

## demo-claim-2
negative: false
positive: echo "second claim OK"
