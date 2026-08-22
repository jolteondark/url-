const claimedReplacementCommitTokens = new WeakSet();

export function claimSafariBattleReplacementSubmit(replacementCommitToken) {
  if (!replacementCommitToken || typeof replacementCommitToken !== "object") {
    throw new Error("battle replacement submit requires a central replacement commit token");
  }
  if (claimedReplacementCommitTokens.has(replacementCommitToken)) {
    throw new Error("battle replacement submit token has already been claimed");
  }
  claimedReplacementCommitTokens.add(replacementCommitToken);
  return replacementCommitToken;
}
