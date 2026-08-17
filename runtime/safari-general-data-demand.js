import {
  installSafariGeneralMasters,
  safariGeneralMastersInstalled,
} from "./safari-playable-data.js";

let loading = null;

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
