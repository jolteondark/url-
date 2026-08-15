import { inflictStatus, cureStatus } from "./battle-status-pp-flow.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function hasAfterMoveRequest(action) {
  return (action?.postHitResolution?.operations ?? []).some((entry) => entry.op === "effects_after_move_request");
}

export function commitBattleSystemsStatusRuntime({ battleInput = {}, turn = {}, pokemon } = {}) {
  let runtime = pokemon;
  const commits = [];
  const executed = new Set(
    (turn?.operations ?? [])
      .filter((entry) => entry.op === "use_move")
      .map((entry) => `${Number(entry.round) - 1}:${Number(entry.action)}`),
  );

  for (const [roundIndex, round] of (battleInput.rounds ?? []).entries()) {
    for (const [actionIndex, action] of (round.actions ?? []).entries()) {
      const input = action?.battleStatusInput;
      if (!input || !executed.has(`${roundIndex}:${actionIndex}`) || !hasAfterMoveRequest(action)) continue;
      const currentState = {
        status: runtime.status ?? "NONE",
        statusCount: Number(runtime.status_count ?? 0),
        toxic: Number(input.state?.toxic ?? 0),
        outrage: Number(input.state?.outrage ?? 0),
        currentMove: input.state?.currentMove ?? null,
        truant: Boolean(input.state?.truant ?? false),
      };
      let flow;
      if (input.kind === "inflict") {
        flow = inflictStatus({ ...input, state: { ...currentState, ...(input.state ?? {}) } });
      } else if (input.kind === "cure") {
        flow = cureStatus({ ...input, state: { ...currentState, ...(input.state ?? {}) } });
      } else {
        throw new TypeError("battleStatusInput.kind must be inflict or cure");
      }
      runtime = updatePokemonRuntime(runtime, {
        status: flow.state.status,
        status_count: Number(flow.state.statusCount ?? 0),
      });
      commits.push({ roundIndex, actionIndex, kind: input.kind, status: runtime.status, statusCount: runtime.status_count, operations: flow.operations });
    }
  }
  return { pokemon: runtime, commits };
}

