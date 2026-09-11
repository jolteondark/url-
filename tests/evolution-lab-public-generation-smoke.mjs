import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const command = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const interaction = await readFile(new URL("../runtime/safari-evolution-lab-interaction.js", import.meta.url), "utf8");

assert.match(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260911-1902/);
assert.doesNotMatch(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260911-1500/);
assert.doesNotMatch(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260911-1030/);
assert.match(index, /\.\/runtime\/safari-evolution-lab-interaction\.js\?v=20260911-1500/);
assert.match(command, /import \{ interactiveSafariEvolutionLab \} from "\.\/safari-evolution-lab-interaction\.js";/);
assert.match(command, /event\.normal_event_id === "evolution_lab"/);
assert.match(command, /return interactiveSafariEvolutionLab\(runtime, index\)/);
assert.match(interaction, /id:"parts"/);
assert.match(interaction, /id:"leave"/);
assert.match(interaction, /id:"stable", label:"安定出力", disabled:true/);
assert.match(interaction, /id:"maximum", label:"最大出力", disabled:true/);
assert.match(interaction, /resolveCanonicalEvolutionLabV108/);
assert.match(interaction, /resolveRewardTransaction/);
assert.match(interaction, /commitSafariBagEconomyReceipt/);
assert.doesNotMatch(command, /STONE_ITEMS|METALCOAT|UPGRADE|DUBIOUSDISC|NUGGET|STARPIECE/);
assert.doesNotMatch(command, /force_evolve|lower_level|normal_seed/);

console.log("evolution lab public generation smoke: ok");
