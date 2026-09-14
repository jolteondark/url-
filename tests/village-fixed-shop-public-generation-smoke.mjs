import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../runtime/safari-village-fixed-shop-integration.js', import.meta.url), 'utf8');

const fresh = './runtime/safari-village-fixed-shop-integration.js?v=20260914-1300';
const stale = './runtime/safari-village-fixed-shop-integration.js?v=20260909-0300';

assert.ok(index.includes(fresh), 'served import map must publish the fixed-shop persistence generation');
assert.equal(index.includes(stale), false, 'stale fixed-shop generation must not remain served');
assert.ok(runtime.includes("reason: 'village_fixed_shop_stock'"), 'served runtime must include stock-materialization persistence');
assert.ok(runtime.includes("reason: 'village_fixed_shop_return'"), 'served runtime must include terminal return persistence');

console.log('village fixed-shop public generation smoke: ok');
