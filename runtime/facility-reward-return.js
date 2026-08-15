export const FACILITY_SOURCES = new Set(["village", "shop", "inn", "chest", "reward", "bounty"]);
export const RETURN_SURFACES = new Set(["village", "day_board"]);

export function resolveFacilityRewardReturn(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("input object is required");
  const source = value.source;
  if (!FACILITY_SOURCES.has(source)) throw new Error("unsupported facility source");
  const returnSurface = value.return_surface ?? "village";
  if (!RETURN_SURFACES.has(returnSurface)) throw new Error("unsupported return surface");

  const bagOperations = value.bag_operations ?? [];
  const moneyOperations = value.money_operations ?? [];
  const stateOperations = value.state_operations ?? [];
  for (const [name, operations] of [["bag_operations", bagOperations], ["money_operations", moneyOperations], ["state_operations", stateOperations]]) {
    if (!Array.isArray(operations) || operations.some((operation) => !operation || typeof operation !== "object" || Array.isArray(operation))) {
      throw new Error(`${name} must be a list of operation objects`);
    }
  }

  const operations = [];
  operations.push(...bagOperations.map((request) => ({ op: "bag_boundary", request: { ...request } })));
  operations.push(...moneyOperations.map((request) => ({ op: "money_boundary", request: { ...request } })));
  operations.push(...stateOperations.map((operation) => ({ ...operation })));
  if (value.save_requested) operations.push({ op: "persistence_boundary", request: { kind: "save" } });

  const returnTo = { surface: returnSurface };
  if (returnSurface === "village") {
    returnTo.village_id = value.village_id ?? null;
  } else {
    const day = value.day;
    if (!Number.isInteger(day) || day < 1) throw new Error("positive day is required when returning to day_board");
    returnTo.day = day;
  }
  operations.push({ op: "return_to_facility_surface", ...returnTo });
  return { result: "returned", source, operations, return_to: returnTo };
}
