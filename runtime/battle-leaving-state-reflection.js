function cloneMoveEntry(move) {
  return typeof move === "string" ? move : { ...move };
}

function readMoveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function withMoveId(move, id) {
  return typeof move === "string" ? id : { ...move, id };
}

export function resolveLeavingBattleStateReflection(input) {
  const operations = [];
  let form = input.form;
  const moves = [...(input.moves || [])].map(cloneMoveEntry);

  if (input.kind === "palafin") {
    if (input.end_battle) form = 0;
  } else if (input.kind === "ogerpon") {
    if (form > 3 && input.end_battle) form -= 4;
  } else if (input.kind === "terapagos") {
    if (form > 0 && input.end_battle) form = 0;
  } else if (input.kind === "zygarde") {
    if (input.core_enforcer_exists && input.end_battle) {
      for (let i = 0; i < moves.length; i += 1) {
        if (readMoveId(moves[i]) === "NIHILLIGHT") moves[i] = withMoveId(moves[i], "COREENFORCER");
      }
    }
    if (input.mega && input.end_battle) {
      operations.push({ op: "make_unmega" });
      if (!Number.isInteger(input.form_after_make_unmega)) {
        throw new TypeError("form_after_make_unmega is required when Zygarde makeUnmega is invoked");
      }
      form = input.form_after_make_unmega;
    }
    if ((form === 2 || form === 3) && (input.fainted || input.end_battle)) form -= 2;
  } else {
    throw new TypeError("unknown kind");
  }

  return { name: input.name, form, moves, operations };
}

