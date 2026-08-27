const EXACT_CANONICAL_MIRRORS = Object.freeze({
  'cursor_fight.png': Object.freeze({
    url: 'https://raw.githubusercontent.com/AxelLoquendo/pokedot-expansion/dee0c296fdd42045c55f8a483b4d5de967647205/graphics/ui/battle/cursor_fight.png',
    gitBlobSha: '0847ee1bdf3cf4834fae8bf76c8b0d28bf7f520e',
    bytes: 14496,
  }),
  'cursor_target.png': Object.freeze({
    url: 'https://raw.githubusercontent.com/AxelLoquendo/pokedot-expansion/dee0c296fdd42045c55f8a483b4d5de967647205/graphics/ui/battle/cursor_target.png',
    gitBlobSha: '3409e552ed54ed6099a53bae023863b56c0b4a37',
    bytes: 3859,
  }),
  'overlay_command.png': Object.freeze({
    url: 'https://raw.githubusercontent.com/AxelLoquendo/pokedot-expansion/dee0c296fdd42045c55f8a483b4d5de967647205/graphics/ui/battle/overlay_command.png',
    gitBlobSha: '05c97f5bae0a6af113d415577dfdefc8c79fd0f8',
    bytes: 956,
  }),
});

export const MAPLESS_BATTLE_UI_CANONICAL_RELEASE = Object.freeze({
  release: 'source-v0.9.108',
  zipSha256: '58324a607ac1cd9566eb19ee3bfd0c049d6d33ce15247d773df74cbe9cc3a446',
});

export function canonicalBattleUiLocalPath(name) {
  const safe = String(name ?? '').trim();
  if (!/^[A-Za-z0-9_]+\.png$/.test(safe)) return null;
  return `assets/canonical-battle-ui/${safe}`;
}

export function canonicalBattleUiExactMirror(name) {
  return EXACT_CANONICAL_MIRRORS[String(name ?? '').trim()] ?? null;
}

export function canonicalBattleUiCandidates(name) {
  const local = canonicalBattleUiLocalPath(name);
  if (!local) return [];
  const mirror = canonicalBattleUiExactMirror(name);
  return mirror ? [local, mirror.url] : [local];
}

export { EXACT_CANONICAL_MIRRORS };
