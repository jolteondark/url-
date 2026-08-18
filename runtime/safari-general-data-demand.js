import {
  installSafariGeneralMasters,
  safariGeneralMastersInstalled,
} from "./safari-playable-data.js";
import {
  safariGeneralCombatModuleSpecifier,
  safariGeneralLoaderSpecifier,
} from "./safari-general-retry-url.js";

let loading = null;
let generalDataRetryGeneration = 0;
let encounterLoading = null;
let trainerLoading = null;
let encounterRuntime = null;
let trainerGenerator = null;
let encounterRetryGeneration = 0;
let trainerRetryGeneration = 0;

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
    const retryGeneration = generalDataRetryGeneration;
    const loaderSpecifier = safariGeneralLoaderSpecifier(retryGeneration);
    traceGeneralCombat("general_data_import_start", { retry_generation: retryGeneration });
    loading = (async () => {
      let data;
      try {
        data = await import(loaderSpecifier);
      } catch (error) {
        generalDataRetryGeneration += 1;
        traceError("general_data_import_error", error, {
          retry_generation: retryGeneration,
          next_retry_generation: generalDataRetryGeneration,
        });
        throw error;
      }

      traceGeneralCombat("general_data_import_ready", { retry_generation: retryGeneration });
      let installed;
      try {
        installed = installSafariGeneralMasters(
          data.SAFARI_GENERAL_SPECIES_MASTERS,
          data.SAFARI_GENERAL_MOVE_MASTERS,
        );
      } catch (error) {
        traceError("general_master_install_error", error, { retry_generation: retryGeneration });
        throw error;
      }

      traceGeneralCombat("general_masters_installed", { ...installed, retry_generation: retryGeneration });
      return { loaded: true, alreadyLoaded: false, ...installed };
    })().finally(() => {
      loading = null;
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
    const retryGeneration = encounterRetryGeneration;
    const moduleSpecifier = safariGeneralCombatModuleSpecifier("wild", retryGeneration);
    traceGeneralCombat("wild_module_import_start", { retry_generation: retryGeneration });
    encounterLoading = import(moduleSpecifier)
      .then((module) => {
        encounterRuntime = module;
        encounterLoading = null;
        traceGeneralCombat("wild_module_import_ready", { retry_generation: retryGeneration });
        return module;
      })
      .catch((error) => {
        encounterLoading = null;
        encounterRetryGeneration += 1;
        traceError("wild_module_import_error", error, {
          retry_generation: retryGeneration,
          next_retry_generation: encounterRetryGeneration,
        });
        throw error;
      });
  }
  return encounterLoading;
}

function loadTrainerGenerator() {
  if (trainerGenerator) return Promise.resolve(trainerGenerator);
  if (!trainerLoading) {
    const retryGeneration = trainerRetryGeneration;
    const moduleSpecifier = safariGeneralCombatModuleSpecifier("trainer", retryGeneration);
    traceGeneralCombat("trainer_module_import_start", { retry_generation: retryGeneration });
    trainerLoading = import(moduleSpecifier)
      .then((module) => {
        trainerGenerator = module;
        trainerLoading = null;
        traceGeneralCombat("trainer_module_import_ready", { retry_generation: retryGeneration });
        return module;
      })
      .catch((error) => {
        trainerLoading = null;
        trainerRetryGeneration += 1;
        traceError("trainer_module_import_error", error, {
          retry_generation: retryGeneration,
          next_retry_generation: trainerRetryGeneration,
        });
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

  const joinedExistingDemand = Boolean(loading || encounterLoading || trainerLoading);
  if (typeof globalThis !== "undefined" && !joinedExistingDemand) globalThis.__maplessGeneralCombatTrace = [];
  traceGeneralCombat("combat_demand_start", { kind: normalized, joined_existing_demand: joinedExistingDemand });

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
