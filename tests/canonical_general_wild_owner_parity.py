import json
import math
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
text = (ROOT / "runtime/general-encounter-species-pools.js").read_text(encoding="utf-8")
match = re.search(r"const POOLS = Object\.freeze\((\{.*\})\);", text, re.S)
assert match, "generated General species pools payload not found"
pools = json.loads(match.group(1))

BANDS = [
    (1, 15, ["NO_EVOLUTION", "ONE_EVOLUTION_BASE", "TWO_EVOLUTION_BASE"]),
    (16, 24, ["NO_EVOLUTION", "ONE_EVOLUTION_BASE", "TWO_EVOLUTION_MIDDLE"]),
    (25, 35, ["NO_EVOLUTION", "ONE_EVOLUTION_FINAL", "TWO_EVOLUTION_MIDDLE"]),
    (36, 100, ["NO_EVOLUTION", "ONE_EVOLUTION_FINAL", "TWO_EVOLUTION_FINAL"]),
]
RANKS = {"WEAK": -2, "NORMAL": 0, "STRONG": 2, "VERY_STRONG": 4}
VARIANCE = [-1, 0, 1]


def resolve(day, required_type, rank, extra, species_roll, variance_roll):
    day_scaling = (day - 1) // 5
    effective = max(day_scaling + RANKS[rank] + extra, 0)
    base = max(1, min(100, 3 + effective * 2))
    stages = next(stages for lo, hi, stages in BANDS if lo <= base <= hi)
    pool = []
    for stage in stages:
        pool.extend(pools[required_type].get(stage, []))
    assert pool
    species_index = math.floor(species_roll * len(pool))
    variance_index = math.floor(variance_roll * len(VARIANCE))
    delta = VARIANCE[variance_index]
    return {
        "species": pool[species_index],
        "pool_size": len(pool),
        "base": base,
        "variance": delta,
        "level": max(1, min(100, base + delta)),
    }

low = resolve(1, "ELECTRIC", "NORMAL", 0, 0.0, 0.0)
assert low["base"] == 3 and low["variance"] == -1 and low["level"] == 2
assert low["species"] == pools["ELECTRIC"]["NO_EVOLUTION"][0]

high = resolve(61, "DRAGON", "STRONG", 1, 0.999999, 0.999999)
assert high["variance"] == 1 and high["level"] == high["base"] + 1
stages = next(stages for lo, hi, stages in BANDS if lo <= high["base"] <= hi)
combined = [species for stage in stages for species in pools["DRAGON"].get(stage, [])]
assert high["species"] == combined[-1]

print("PASS Python parity: canonical General wild species/level thresholds")
