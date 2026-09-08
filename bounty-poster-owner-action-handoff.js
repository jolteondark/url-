// Compatibility-only delivery surface. Day Board activation is owned by
// runtime/safari-pokemon-center-command.js and shared normal-event actions by
// normal-event-touch-presentation.js. Keep no click/persistence side effects here.
export {
  bountyPosterUi,
  openSafariBountyPosterTouch,
  resolveSafariBountyPosterInteraction,
} from "./runtime/safari-bounty-poster-interaction.js";
