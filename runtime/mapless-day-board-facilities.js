function rubyToInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function resolveDayBoardFacilityActivation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("input object is required");
  }
  const kind = input.kind;
  if (kind === "center") {
    const index = Number.parseInt(input.index, 10);
    if (!Number.isInteger(index)) throw new Error("center index is required");
    if (typeof input.healed !== "boolean") throw new Error("resolved heal result is required");
    const notice = input.healed ? "手持ちを全回復しました。" : "回復できませんでした。";
    return {
      operations: [
        { op: "heal_party", result: input.healed },
        { op: "set_board_consumed", index, value: true },
        { op: "set_notice", text: notice },
      ],
      notice,
      result: "completed",
    };
  }

  const day = Math.max(rubyToInt(input.day), 1);
  if (kind === "shop") {
    const notice = "フレンドリィショップから戻りました。何度でも利用できます。";
    return {
      operations: [
        { op: "open_shop_hub", day },
        { op: "set_notice", text: notice },
      ],
      notice,
      result: "completed",
    };
  }
  if (kind === "egg_shop") {
    const notice = "卵屋から戻りました。何度でも利用できます。";
    return {
      operations: [
        { op: "open_egg_shop", day },
        { op: "set_notice", text: notice },
      ],
      notice,
      result: "completed",
    };
  }
  throw new Error(`unsupported facility kind: ${kind}`);
}
