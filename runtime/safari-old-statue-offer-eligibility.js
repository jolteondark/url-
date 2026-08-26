import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatueBonusCandidates,
  safariOldStatueOfferEntries as baseOfferEntries,
  safariOldStatuePrayNeedsPokemon,
  safariOldStatuePresentation,
} from "./safari-old-statue-offer-battle.js?v=20260826-1700";
import { maplessV108ItemMetadata } from "./mapless-v108-item-metadata.js";

function offerableItem(id) {
  const meta = maplessV108ItemMetadata(id);
  return Boolean(meta && !meta.keyItem && !meta.machine && (meta.berry || Number(meta.price) > 0));
}

export { safariOldStatueBonusCandidates, safariOldStatuePrayNeedsPokemon, safariOldStatuePresentation };

export function safariOldStatueOfferEntries(runtime, index) {
  return baseOfferEntries(runtime, index).filter((entry) => offerableItem(entry.id));
}

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction, options = {}) {
  const action = String(requestedAction ?? "");
  if (action === "offer") {
    const offeredItem = String(options?.offeredItem ?? "");
    if (offeredItem && !offerableItem(offeredItem)) {
      const state = runtime?.variables?.mapless;
      const notice = "その道具は石像への供物にできません。道具もイベントも消費していません。";
      if (state && typeof state === "object" && !Array.isArray(state)) state.notice = notice;
      return {
        runtime,
        result:"old_statue_offer_item_ineligible",
        completed:false,
        operations:[],
        notice,
        persistenceRequested:false,
      };
    }
  }
  return await resolveBaseOldStatueInteraction(runtime, index, action, options);
}
