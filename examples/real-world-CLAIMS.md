# Proof or It Didn't Happen — real-world claims
# Each claim runs the gate against a real public repo cloned fresh inside
# the Sprite (no install needed: chalk vendors its deps and runs node:test;
# is is checked by fixtures/is-assert.mjs via Node type-stripping).
# Negative = the same repo with one real line broken; positive = clean repo.

## real-chalk
negative: rm -rf /home/sprite/targets/chalk && git clone -q --depth 1 https://github.com/chalk/chalk.git /home/sprite/targets/chalk && cd /home/sprite/targets/chalk && sed -i 's/createStyler(style.open, style.close/createStyler(style.close, style.open/' source/index.js && node --test test/chalk.js test/instance.js test/visible.js test/no-color-support.js
positive: rm -rf /home/sprite/targets/chalk && git clone -q --depth 1 https://github.com/chalk/chalk.git /home/sprite/targets/chalk && cd /home/sprite/targets/chalk && node --test test/chalk.js test/instance.js test/visible.js test/no-color-support.js

## real-is
negative: rm -rf /home/sprite/targets/is && git clone -q --depth 1 https://github.com/sindresorhus/is.git /home/sprite/targets/is && sed -i "s/typeof value === 'string'/typeof value !== 'string'/" /home/sprite/targets/is/source/index.ts && node /home/sprite/fixtures/is-assert.mjs /home/sprite/targets/is
positive: rm -rf /home/sprite/targets/is && git clone -q --depth 1 https://github.com/sindresorhus/is.git /home/sprite/targets/is && node /home/sprite/fixtures/is-assert.mjs /home/sprite/targets/is
