export function resolveBattleStartCore({
  sendOuts,
  weatherAnimation = null,
  terrainAnimation = null,
}) {
  const operations = [
    { op: "setup_sides", result: sendOuts },
    { op: "create_ai_objects" },
    { op: "scene_start_battle" },
    { op: "start_battle_send_out", send_outs: sendOuts },
  ];
  if (weatherAnimation != null) {
    operations.push({ op: "common_animation", kind: "weather", animation: weatherAnimation });
  }
  operations.push({ op: "weather_start_message" });
  if (terrainAnimation != null) {
    operations.push({ op: "common_animation", kind: "terrain", animation: terrainAnimation });
  }
  operations.push(
    { op: "terrain_start_message" },
    { op: "all_battlers_entering_battle" },
    { op: "battle_loop_handoff" },
  );
  return { result: null, operations };
}
