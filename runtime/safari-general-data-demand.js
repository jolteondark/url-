import {
  installSafariGeneralMasters,
  safariGeneralMastersInstalled,
} from "./safari-playable-data.js";

let loading = null;
let encounterLoading = null;
let trainerLoading = null;
let encounterRuntime = null;
let trainerGenerator = null;

export function safariGeneralDataReady() {
  return safariGeneralMastersInstalled();
}

export async function ensureSafariGeneralData() {
  if (safariGeneralMastersInstalled()) {
    return { loaded: false, alreadyLoaded: true };
  }
  if (!loading) {
    loading = import("./safari-general-encounter-data-loader.js")
      .then((data) => {
        const installed = installSafariGeneralMasters(
          data.SAFARI_GENERAL_SPECIES_MASTERS,
          data.SAFARI_GENERAL_MOVE_MASTERS,
        );
        return { loaded: true, alreadyLoaded: false, ...installed };
      })
      .catch((error) => {
        loading = null;
        throw error;
      });
  }
  return loading;
}

function normalizeCombatKind(kind = null) {
  if (kind == null || kind === "both") return "both";
  if (kind === "wild" || kind === "trainer") return kind;
  throw new TypeError(`unknown Safari GENERAL combat kind: ${kind}`);
}

function loadEncounterRuntime() {
  if (encounterRuntime) return Promise.resolve(encounterRuntime);
  if (!encounterLoading) {
    encounterLoading = import("./safari-general-encounter-runtime.js")
      .then((module) => {
        encounterRuntime = module;
        return module;
      })
      .catch((error) => {
        encounterLoading = null;
        throw error;
      });
  }
  return encounterLoading;
}

function loadTrainerGenerator() {
  if (trainerGenerator) return Promise.resolve(trainerGenerator);
  if (!trainerLoading) {
    trainerLoading = import("./mapless-dynamic-trainer-generator.js")
      .then((module) => {
        trainerGenerator = module;
        return module;
      })
      .catch((error) => {
        trainerLoading = null;
        throw error;
      });
  }
  return trainerLoading;
}

export function safariGeneralCombatReady(kind = null) {
  const normalized = normalizeCombatKind(kind);
  if (normalized === "wild") return encounterRuntime !== null;
  if (normalized === "trainer") return trainerGenerator !== null;
  return encounterRuntime !== null && trainerGenerator !== null;
}

export async function ensureSafariGeneralCombatData(kind = null) {
  const normalized = normalizeCombatKind(kind);
  const needEncounter = normalized === "both" || normalized === "wild";
  const needTrainer = normalized === "both" || normalized === "trainer";
  const wasReady = safariGeneralCombatReady(normalized);
  const tasks = [];

  if (needEncounter && !encounterRuntime) {
    tasks.push(loadEncounterRuntime().then(
      () => ({ kind: "wild", ok: true }),
      (error) => ({ kind: "wild", ok: false, error }),
    ));
  }
  if (needTrainer && !trainerGenerator) {
    tasks.push(loadTrainerGenerator().then(
      () => ({ kind: "trainer", ok: true }),
      (error) => ({ kind: "trainer", ok: false, error }),
    ));
  }

  const results = await Promise.all(tasks);
  if (!safariGeneralCombatReady(normalized)) {
    const failure = results.find((entry) => !entry.ok && (normalized === "both" || entry.kind === normalized));
    // For the legacy no-argument preload, one healthy combat path is enough to
    // continue to the event-specific combat-start owner. This prevents an
    // unrelated trainer import from blocking a wild cell (and vice versa).
    if (normalized !== "both" || (!encounterRuntime && !trainerGenerator)) {
      throw failure?.error ?? new Error(`Safari GENERAL ${normalized} combat module failed to load`);
    }
  }

  return {
    loaded: !wasReady && safariGeneralCombatReady(normalized),
    alreadyLoaded: wasReady,
    combatModulesLoaded: safariGeneralCombatReady(normalized),
    fullMastersInstalled: safariGeneralMastersInstalled(),
    encounterLoaded: encounterRuntime !== null,
    trainerLoaded: trainerGenerator !== null,
  };
}

export function safariGeneralCombatModules(kind = null) {
  const normalized = normalizeCombatKind(kind);
  if (!safariGeneralCombatReady(normalized)) throw new Error(`Safari GENERAL ${normalized} combat data is not ready`);
  return { encounterRuntime, trainerGenerator };
}

// Existing Node smoke/integration tests call combat owners directly instead of
// going through the browser click gate. Preserve that test contract without
// reintroducing Safari startup cost.
if (typeof window === "undefined") await ensureSafariGeneralCombatData();
