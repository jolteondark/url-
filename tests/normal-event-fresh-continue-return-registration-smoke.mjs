import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const command = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const continuation = await readFile(new URL("../runtime/safari-normal-event-battle-continuation.js", import.meta.url), "utf8");
const honeyTree = await readFile(new URL("../runtime/safari-honey-tree-interaction.js", import.meta.url), "utf8");
const pokemonNest = await readFile(new URL("../runtime/safari-pokemon-nest-interaction.js", import.meta.url), "utf8");
const sleepingGiant = await readFile(new URL("../runtime/safari-sleeping-giant-interaction.js", import.meta.url), "utf8");

assert.match(command, /import "\.\/safari-honey-tree-interaction\.js";/);
assert.match(command, /import "\.\/safari-pokemon-nest-interaction\.js";/);
assert.match(command, /import "\.\/safari-sleeping-giant-interaction\.js";/);

assert.match(honeyTree, /registerSafariNormalEventBattleContinuation\("honey_tree"/);
assert.match(honeyTree, /activateSafariNormalEventWildBattle/);
assert.match(pokemonNest, /registerSafariNormalEventBattleContinuation\("pokemon_nest"/);
assert.match(pokemonNest, /activateSafariNormalEventWildBattle/);
assert.match(sleepingGiant, /registerSafariNormalEventBattleContinuation\("sleeping_giant"/);
assert.match(sleepingGiant, /activateSafariNormalEventWildBattle/);

assert.match(continuation, /request_save", reason:"normal_event_battle_started"/);
assert.match(continuation, /normal_event_continuation_handler_required/);

console.log("normal event fresh Continue RETURN registration smoke: ok");
