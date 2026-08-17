import {
  installSafariGeneralMasters,
  safariGeneralMastersInstalled,
} from "./safari-playable-data.js";

const DATA_IMPORT_TIMEOUT_MS = 60_000;
const COMBAT_IMPORT_TIMEOUT_MS = 20_000;
let loading = null;
let combatLoading = null;
let encounterRuntime = null;
let trainerGenerator = null;

function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
}

export function safariGeneralDataReady() {
  return safariGeneralMastersInstalled();
}

export async function ensureSafariGeneralData() {
  if (safariGeneralMastersInstalled()) {
    return { loaded: false, alreadyLoaded: true };
  }
  if (!loading) {
    loading = withTimeout(
      import("./safari-general-encounter-data-loader.js"),
      DATA_IMPORT_TIMEOUT_MS,
      "Safari GENERAL data import",
    )
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

export function safariGeneralCombatReady() {
  return safariGeneralMastersInstalled() && encounterRuntime !== null && trainerGenerator !== null;
}

export async function ensureSafariGeneralCombatData() {
  if (safariGeneralCombatReady()) return { loaded: false, alreadyLoaded: true };
  if (!combatLoading) {
    combatLoading = ensureSafariGeneralData()
      .then(async (dataResult) => {
        const [encounter, trainer] = await withTimeout(
          Promise.all([
            import("./safari-general-encounter-runtime.js"),
            import("./mapless-dynamic-trainer-generator.js"),
          ]),
          COMBAT_IMPORT_TIMEOUT_MS,
          "Safari GENERAL combat modules",
        );
        encounterRuntime = encounter;
        trainerGenerator = trainer;
        return { ...dataResult, combatModulesLoaded: true };
      })
      .catch((error) => {
        combatLoading = null;
        throw error;
      });
  }
  return combatLoading;
}

export function safariGeneralCombatModules() {
  if (!safariGeneralCombatReady()) throw new Error("Safari GENERAL combat data is not ready");
  return { encounterRuntime, trainerGenerator };
}

// Existing Node smoke/integration tests call combat owners directly instead of
// going through the browser click gate. Preserve that test contract without
// reintroducing Safari startup cost.
if (typeof window === "undefined") await ensureSafariGeneralCombatData();
