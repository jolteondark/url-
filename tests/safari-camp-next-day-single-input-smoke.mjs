import assert from "node:assert/strict";
import fs from "node:fs";

const camp = fs.readFileSync(new URL("../camp-presentation.js", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(camp, /let campAdvancing = false;/, "camp must own a synchronous in-flight guard");
assert.match(camp, /if\(!button \|\| campAdvancing\) return;\s*setCampAdvancing\(true\);/, "duplicate confirm must be rejected before any next-day owner call");
assert.match(camp, /byId\("camp-confirm"\)\.disabled=campAdvancing;/, "confirm must become inert while advancing");
assert.match(camp, /byId\("camp-cancel"\)\.disabled=campAdvancing;/, "cancel must not race an in-flight day advance");
assert.match(camp, /const owner=prepareSafariCampNextDay\(rt,index,true\);\s*applySafariCampRecovery\(rt,owner\);\s*const boundaryEntry=applySafariBoundaryTrialEntry\(rt,owner\);/, "single accepted input must keep canonical camp/boundary owners in sequence");
assert.match(camp, /if\(!boundaryEntry\.entered\)\{\s*await activateSafariDayBoardCell\(rt,index\);/, "ordinary next-day advance must still use the shared Day Board owner");
assert.doesNotMatch(camp, /\.click\(\)/, "camp must not replay synthetic clicks");
assert.match(shell, /camp-presentation\.js\?v=20260819-0618/, "physical Safari must request the single-input camp build");

console.log("Safari camp next-day single-input smoke: ok");
