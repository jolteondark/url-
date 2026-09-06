import assert from "node:assert/strict";
import { projectExecutedBattleWeatherCanonical } from "../runtime/battle-weather-environment-state.js";

const preparedBattleInput = {
  rounds: [{
    actions: [
      { kind: "move", functionCode: "StartRainWeather", moveSkipped: false, lastMoveFailed: false },
      { kind: "move", functionCode: "StartSunWeather", moveSkipped: false, lastMoveFailed: false },
    ],
  }],
};

assert.deepEqual(
  projectExecutedBattleWeatherCanonical(null, preparedBattleInput, {
    operations: [
      { op: "use_move", round: 1, action: 0 },
      { op: "judge", round: 1, action: 0, decision: 1 },
    ],
  }),
  { weather: "Rain", turns: 5 },
  "a later precomputed but unexecuted weather move must not commit",
);

assert.deepEqual(
  projectExecutedBattleWeatherCanonical(null, preparedBattleInput, {
    operations: [
      { op: "use_move", round: 1, action: 0 },
      { op: "use_move", round: 1, action: 1 },
      { op: "end_of_round_phase", round: 1 },
      { op: "end_of_round_phase", round: 1 },
    ],
  }),
  { weather: "Sun", turns: 4 },
  "executed moves commit in order and duration advances exactly once per completed round",
);

assert.deepEqual(
  projectExecutedBattleWeatherCanonical({ weather: "Rain", turns: 2 }, preparedBattleInput, {
    operations: [{ op: "end_of_battle", decision: 1 }],
  }),
  { weather: "Rain", turns: 2 },
  "battle termination before end-of-round must not decrement weather",
);

console.log("battle weather executed projection smoke: ok");
