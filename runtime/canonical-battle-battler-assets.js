const CANONICAL_BATTLE_FRONT_SPECIES = Object.freeze([
  "CATERPIE",
  "CHARMANDER",
  "DRUDDIGON",
  "DWEBBLE",
  "GASTLY",
  "HERACROSS",
  "KANGASKHAN",
  "LAPRAS",
  "MAWILE",
  "PICHU",
  "PIDGEY",
  "PLUSLE",
  "RALTS",
  "SABLEYE",
  "SEVIPER",
  "SHUCKLE",
  "STUNFISK",
  "TROPIUS",
]);

const CANONICAL_BATTLE_BACK_SPECIES = Object.freeze([
  "CATERPIE",
  "CHARMANDER",
  "DRUDDIGON",
  "DWEBBLE",
  "GASTLY",
  "HERACROSS",
  "PICHU",
]);
const observedDocuments = new WeakSet();

function canonicalSpeciesIdentifier(species) {
  const identifier = String(species ?? "").trim().toUpperCase();
  return /^[A-Z0-9_]+$/.test(identifier) ? identifier : null;
}

export function resolveCanonicalBattleBattlerAsset(side, species) {
  const identifier = canonicalSpeciesIdentifier(species);
  if (!identifier) return null;
  if (side === "foe" && CANONICAL_BATTLE_FRONT_SPECIES.includes(identifier)) {
    return `./assets/canonical-battle-sprites/front/${identifier}.png`;
  }
  if (side === "player" && CANONICAL_BATTLE_BACK_SPECIES.includes(identifier)) {
    return `./assets/canonical-battle-sprites/back/${identifier}.png`;
  }
  return null;
}

function rememberDiagnostic(side, species, state, src = null, error = null) {
  const diagnostics = globalThis.__maplessBattleSpriteDiagnostics ??= {};
  diagnostics[side] = Object.freeze({
    side,
    species: String(species ?? ""),
    state,
    src,
    error: error?.message ?? null,
  });
}

function syncCanonicalBattleBattler(documentRef, side) {
  const combatant = documentRef.getElementById(`${side}-combatant`);
  const name = documentRef.getElementById(`${side}-name`);
  const placeholder = combatant?.querySelector(".text-mon");
  if (!combatant || !name || !placeholder) return;

  const species = name.textContent?.trim() ?? "";
  const src = resolveCanonicalBattleBattlerAsset(side, species);
  const requestKey = `${species}|${src ?? "missing"}`;
  if (placeholder.dataset.canonicalBattleSpriteRequest === requestKey) return;
  placeholder.dataset.canonicalBattleSpriteRequest = requestKey;
  placeholder.replaceChildren();
  delete placeholder.dataset.canonicalBattleSpriteSrc;

  if (!src) {
    placeholder.dataset.canonicalBattleSprite = "missing";
    combatant.dataset.canonicalBattleSprite = "missing";
    rememberDiagnostic(side, species, "missing");
    return;
  }

  placeholder.dataset.canonicalBattleSprite = "loading";
  combatant.dataset.canonicalBattleSprite = "loading";
  const image = documentRef.createElement("img");
  image.className = "canonical-battle-battler-image";
  image.alt = species;
  image.decoding = "async";
  image.draggable = false;
  image.addEventListener("load", () => {
    if (placeholder.dataset.canonicalBattleSpriteRequest !== requestKey) return;
    placeholder.dataset.canonicalBattleSprite = "ready";
    placeholder.dataset.canonicalBattleSpriteSrc = src;
    combatant.dataset.canonicalBattleSprite = "ready";
    rememberDiagnostic(side, species, "ready", src);
  }, { once: true });
  image.addEventListener("error", () => {
    if (placeholder.dataset.canonicalBattleSpriteRequest !== requestKey) return;
    image.remove();
    placeholder.dataset.canonicalBattleSprite = "error";
    combatant.dataset.canonicalBattleSprite = "error";
    const error = new Error(`canonical Battle battler asset failed to load: ${src}`);
    globalThis.__maplessLastError = error;
    rememberDiagnostic(side, species, "error", src, error);
  }, { once: true });
  image.src = src;
  placeholder.appendChild(image);
}

function installCanonicalBattleBattlerStyle(documentRef) {
  if (documentRef.getElementById("canonical-battle-battler-assets-style")) return;
  const style = documentRef.createElement("style");
  style.id = "canonical-battle-battler-assets-style";
  style.textContent = `
#battle-card .text-mon[data-canonical-battle-sprite] {
  color: transparent !important;
  font-size: 0 !important;
  line-height: 0 !important;
}
#battle-card .text-mon[data-canonical-battle-sprite="missing"],
#battle-card .text-mon[data-canonical-battle-sprite="error"] {
  visibility: hidden !important;
}
#battle-card .canonical-battle-battler-image {
  display: block !important;
  width: auto !important;
  height: auto !important;
  max-width: 136px !important;
  max-height: 136px !important;
  image-rendering: pixelated;
  user-select: none;
  -webkit-user-drag: none;
}
`;
  documentRef.head.appendChild(style);
}

export function installCanonicalBattleBattlerAssets(documentRef = document) {
  if (observedDocuments.has(documentRef)) return;
  installCanonicalBattleBattlerStyle(documentRef);
  const sync = () => {
    syncCanonicalBattleBattler(documentRef, "foe");
    syncCanonicalBattleBattler(documentRef, "player");
  };
  sync();

  const MutationObserverRef = documentRef.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  if (!MutationObserverRef) throw new Error("canonical Battle battler presentation requires MutationObserver");
  const observer = new MutationObserverRef((records) => {
    if (records.some((record) => record.target?.nodeType === 3 || record.type === "childList")) sync();
  });
  [documentRef.getElementById("foe-name"), documentRef.getElementById("player-name")]
    .filter(Boolean)
    .forEach((node) => observer.observe(node, { childList: true, characterData: true, subtree: true }));
  observedDocuments.add(documentRef);
}

export {
  CANONICAL_BATTLE_FRONT_SPECIES,
  CANONICAL_BATTLE_BACK_SPECIES,
};
