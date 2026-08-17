import assert from "node:assert/strict";
import {
  installSafariGeneralMasters,
  SAFARI_MOVE_MASTERS,
  SAFARI_SPECIES_MASTERS,
} from "../runtime/safari-playable-data.js";
import { SAFARI_MOVE_PRESENTATION } from "../runtime/safari-move-presentation-live.js";

assert.equal(SAFARI_MOVE_PRESENTATION.ROCKTOMB.power, 0, "bootstrap placeholder is lightweight");

installSafariGeneralMasters(
  SAFARI_SPECIES_MASTERS,
  {
    ...SAFARI_MOVE_MASTERS,
    ROCKTOMB: {
      id: "ROCKTOMB",
      name: "Rock Tomb",
      category: "Physical",
      power: 60,
      accuracy: 95,
      total_pp: 15,
      priority: 0,
      type: "ROCK",
      thaws_user: false,
    },
  },
);

assert.equal(SAFARI_MOVE_PRESENTATION.ROCKTOMB.name, "Rock Tomb");
assert.equal(SAFARI_MOVE_PRESENTATION.ROCKTOMB.power, 60);
assert.equal(SAFARI_MOVE_PRESENTATION.ROCKTOMB.accuracy, 95);
assert.equal(SAFARI_MOVE_PRESENTATION.ROCKTOMB.totalPp, 15);
console.log("safari live move presentation smoke: ok");
