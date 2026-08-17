import {
  installSafariGeneralMasters,
  safariGeneralMastersInstalled,
} from "./safari-playable-data.js";

let loading = null;
let encounterLoading = null;
let trainerLoading = null;
let encounterRuntime = null;
let trainerGenerator = null;

function traceGeneralCombat(stage, detail = {}) {
  if (typeof globalThis === "undefined") return;
  const trace = Array.isArray(globalThis.__maplessGeneralCombatTrace)
    ? globalThis.__maplessGeneralCombatTrace
    : [];
  trace.push(Object.freeze({ stage, ...detail }));
  globalThis.__maplessGeneralCombatTrace = trace;
}

function traceError(stage, error, detail = {}) {
  traceGeneralCombat(stage, {
    ...detail,
    error_name: error?.name ?? "Error",
    error_message: error?.message ?? String(error),
  });
}

export function safariGeneralDataReady() {
  return safariGeneralMastersInstalled();
}

export async function ensureSafariGeneralData() {
  if (safariGeneralMastersInstalled()) {
    traceGeneralCombat("general_masters_already_ready");
    return { loaded: false, alreadyLoaded: true };
  }
  if (!loading) {
    traceGeneralCombat("general_data_import_start");
    loading = import("./safari-general-encounter-data-loader.js")
      .then((data) => {
        traceGeneralCombat("general_data_import_ready");
        const installed = installSafariGeneralMasters(
          data.SAFARI_GENERAL_SPECIES_MASTERS,
          data.SAFARI_GENERAL_MOVE_MASTERS,
        );
        traceGeneralCombat("general_masters_installed", installed);
        return { loaded: true, alreadyLoaded: false, ...installed };
      })
      .catch((error) => {
        loading = null;
        traceError("general_data_import_error", error);
        throw error;
      });
  } else {
    traceGeneralCombat("general_data_import_join");
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
    traceGeneralCombat("wild_module_import_start");
    encounterLoading = import("./safari-general-encounter-runtime.js")
      .then((module) => {
        encounterRuntime = module;
        traceGeneralCombat("wild_module_import_ready");
        return module;
      })
      .catch((error) => {
        encounterLoading = null;
        traceError("wild_module_import_error", error);
        throw error;
      });
  }
  return encounterLoading;
}

function loadTrainerGenerator() {
  if (trainerGenerator) return Promise.resolve(trainerGenerator);
  if (!trainerLoading) {
    traceGeneralCombat("trainer_module_import_start");
    trainerLoading = import("./mapless-dynamic-trainer-generator.js")
      .then((module) => {
        trainerGenerator = module;
        traceGeneralCombat("trainer_module_import_ready");
        return module;
      })
      .catch((error) => {
        trainerLoading = null;
        traceError("trainer_module_import_error", error);
        throw error;
      });
  }
  return trainerLoading;
}

export function safariGeneralCombatReady(kind = null) {
  const normalized = normalizeCombatKind(kind);
  if (!safariGeneralMastersInstalled()) return false;
  if (normalized === "wild") return encounterRuntime !== null;
  if (normalized === "trainer") return trainerGenerator !== null;
  return encounterRuntime !== null && trainerGenerator !== null;
}

export async function ensureSafariGeneralCombatData(kind = null) {
  const implicitKind = kind == null;
  const normalized = normalizeCombatKind(kind);
  const needEncounter = normalized === "both" || normalized === "wild";
  const needTrainer = normalized === "both" || normalized === "trainer";
  const wasReady = safariGeneralCombatReady(normalized);

  // Browser presentation may probe combat readiness without knowing the selected
  // event kind. Do not start any async GENERAL demand from that non-owner probe:
  // the actual wild/trainer click enters safari-web-combat-start with event.kind,
  // where loading, rollback and exact error identity are one atomic transition.
  if (implicitKind) {
    return {
      loaded: false,
      alreadyLoaded: wasReady,
      combatModulesLoaded: wasReady,
      fullMastersInstalled: safariGeneralMastersInstalled(),
      encounterLoaded: encounterRuntime !== null,
      trainerLoaded: trainerGenerator !== null,
    };
  }

  if (typeof globalThis !== "undefined") globalThis.__maplessGeneralCombatTrace = [];
  traceGeneralCombat("combat_demand_start", { kind: normalized });

  // Battle materialization consumes SAFARI_SPECIES_MASTERS / SAFARI_MOVE_MASTERS.
  // A loaded encounter/trainer module alone is therefore not combat-ready.
  // Install the canonical GENERAL masters before allowing combat-start to run.
  await ensureSafariGeneralData();
  traceGeneralCombat("combat_masters_ready", { kind: normalized });

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
    const error = failure?.error ?? new Error(`Safari GENERAL ${normalized} combat module failed to load`);
    traceError("combat_demand_error", error, { kind: normalized });
    throw error;
  }

  traceGeneralCombat("combat_demand_ready", { kind: normalized });
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

if (typeof window === "undefined") await ensureSafariGeneralCombatData("both");
