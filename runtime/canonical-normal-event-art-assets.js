const CANONICAL_NORMAL_EVENT_ART = Object.freeze({
  evolution_lab: "ev_evolab.png",
  old_statue: "ev_statue.png",
  wishing_fountain: "ev_wishingwell.png",
  trainer_camp: "ev_trainercamp.png",
  berry_juice_shop: "ev_juice.png",
  lost_bag: "ev_lostbag.png",
  auction: "ev_auction.png",
  photographer: "ev_photographer.png",
  pokemon_nest: "ev_nest.png",
  sleeping_giant: "ev_giant.png",
  traveling_cook: "ev_chef.png",
  berry_thief: "ev_berrythief.png",
  mushroom_field: "ev_mushroom.png",
  hot_spring: "ev_hotspring.png",
  fake_nurse: "ev_nurse.png",
  flooded_river: "ev_river.png",
  burning_wagon: "ev_wagon.png",
  meteor_fragment: "ev_meteor.png",
  honey_tree: "ev_honeytree.png",
  lost_pokemon: "ev_lostmon.png",
});

// Binary publication is intentionally explicit. Canonical source recovery alone is
// not enough: an identifier becomes Web-reachable only after exact source bytes
// are present in the repository and verified. Keep this empty until that happens.
const PUBLISHED_CANONICAL_NORMAL_EVENT_ART = new Set();

export function canonicalNormalEventArtDescriptor(eventId) {
  const id = String(eventId ?? "");
  const filename = CANONICAL_NORMAL_EVENT_ART[id];
  if (!filename) return null;
  return Object.freeze({
    eventId:id,
    filename,
    path:`assets/canonical-normal-event-art/${filename}`,
    published:PUBLISHED_CANONICAL_NORMAL_EVENT_ART.has(id),
  });
}

export function resolveCanonicalNormalEventArt(eventId) {
  const descriptor = canonicalNormalEventArtDescriptor(eventId);
  return descriptor?.published === true ? descriptor.path : null;
}

export function hasCanonicalNormalEventArtSource(eventId) {
  return canonicalNormalEventArtDescriptor(eventId) !== null;
}
