// Canonical source-v0.9.108 boundary trial leader identities.
// Source: Plugins/ZZZZZZZZZZZZZZZZZZZ Mapless Boundary Trials/001_Mapless_Boundary_Trial_Data.rb
export const MAPLESS_BOUNDARY_LEADER_ORDER_V108 = Object.freeze([
  "BROCK", "MISTY", "SURGE", "ERIKA", "KOGA", "SABRINA", "BLAINE", "GREEN",
]);

export const MAPLESS_BOUNDARY_LEADERS_V108 = Object.freeze({
  BROCK: Object.freeze({ id: "BROCK", name: "タケシ" }),
  MISTY: Object.freeze({ id: "MISTY", name: "カスミ" }),
  SURGE: Object.freeze({ id: "SURGE", name: "マチス" }),
  ERIKA: Object.freeze({ id: "ERIKA", name: "エリカ" }),
  KOGA: Object.freeze({ id: "KOGA", name: "キョウ" }),
  SABRINA: Object.freeze({ id: "SABRINA", name: "ナツメ" }),
  BLAINE: Object.freeze({ id: "BLAINE", name: "カツラ" }),
  GREEN: Object.freeze({ id: "GREEN", name: "グリーン" }),
});

export function maplessBoundaryLeaderNameV108(id) {
  return MAPLESS_BOUNDARY_LEADERS_V108[String(id ?? "").toUpperCase()]?.name ?? "不明";
}
