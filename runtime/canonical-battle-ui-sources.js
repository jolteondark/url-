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

export const PUBLISHED_CANONICAL_BATTLE_UI = Object.freeze({
  'cursor_command.png': Object.freeze({
    canonicalGitBlobSha: 'c73f69b29b93355a605d7c0d2aa611e36a007020',
    canonicalSha256: '614722591ecfa667be586e0c9df985c5b4bcbac2b8f3c3b2beed1fc4c7094d39',
    bytes: 8456,
  }),
  'overlay_hp.png': Object.freeze({
    canonicalGitBlobSha: '7064a0ca0dc20a7fd91c4f155af93d95b58c8280',
    canonicalSha256: '087d8f80277526e7814a965dfdc27c61312f5e29a1bd5632bfea8e280d2b72b5',
    bytes: 120,
  }),
  'icon_statuses.png': Object.freeze({
    canonicalGitBlobSha: 'b3e204c5d53a6d17a556a8602f516ea4db2bbfff',
    canonicalSha256: 'f1220f895c686dc8601916769be7853960a44f0efdccbd4b1ec429906dd33fa0',
    bytes: 756,
  }),
  'types.png': Object.freeze({
    canonicalGitBlobSha: '7f1b9d801436bbf1fc215aed24093292d3c0c8ba',
    canonicalSha256: '9dd259f26d6983ebe738b2a088941dce88f2acc63391dc8a3303190eea26f5ea',
    bytes: 4380,
  }),
});

export const UNRESOLVED_CANONICAL_BATTLE_UI = Object.freeze({});

export function canonicalBattleUiLocalPath(name) {
  const safe = String(name ?? '').trim();
  if (!/^[A-Za-z0-9_]+\.png$/.test(safe)) return null;
  if (UNRESOLVED_CANONICAL_BATTLE_UI[safe]) return null;
  return `assets/canonical-battle-ui/${safe}`;
}

export function canonicalBattleUiExactMirror(name) {
  return EXACT_CANONICAL_MIRRORS[String(name ?? '').trim()] ?? null;
}

export function canonicalBattleUiCandidates(name) {
  const safe = String(name ?? '').trim();
  if (UNRESOLVED_CANONICAL_BATTLE_UI[safe]) return [];
  const local = canonicalBattleUiLocalPath(safe);
  if (!local) return [];
  const mirror = canonicalBattleUiExactMirror(safe);
  const published = PUBLISHED_CANONICAL_BATTLE_UI[safe] ?? null;
  if (published) return mirror ? [local, mirror.url] : [local];
  if (mirror) return [mirror.url];
  return [local];
}

export function canonicalBattleUiResolutionState(name) {
  const safe = String(name ?? '').trim();
  const unresolved = UNRESOLVED_CANONICAL_BATTLE_UI[safe];
  if (unresolved) return Object.freeze({ status: 'blocked', name: safe, ...unresolved });
  const mirror = canonicalBattleUiExactMirror(safe);
  const published = PUBLISHED_CANONICAL_BATTLE_UI[safe] ?? null;
  return Object.freeze({ status: 'eligible', name: safe, mirror: Boolean(mirror), published });
}

export { EXACT_CANONICAL_MIRRORS };
