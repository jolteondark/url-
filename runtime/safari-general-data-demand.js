import {
  installSafariGeneralMasters,
  safariGeneralMastersInstalled,
} from "./safari-playable-data.js";

let loading = null;
let combatLoading = null;
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

export function safariGeneralCombatReady() {
  return safariGeneralMastersInstalled() && encounterRuntime !== null && trainerGenerator !== null;
}

export async function ensureSafariGeneralCombatData() {
  if (safariGeneralCombatReady()) return { loaded: false, alreadyLoaded: true };
  if (!combatLoading) {
    combatLoading = ensureSafariGeneralData()
      .then(async (dataResult) => {
        const [encounter, trainer] = await Promise.all([
          import("./safari-general-encounter-runtime.js"),
          import("./mapless-dynamic-trainer-generator.js"),
        ]);
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
