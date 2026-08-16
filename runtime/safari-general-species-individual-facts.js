// Generated compact individual-creation facts for the 875 canonical GENERAL species.
// Ordering matches the alphabetically keyed Safari GENERAL species projection.
const GENDER_RATIO_IDS = Object.freeze(["AlwaysMale","AlwaysFemale","Genderless","FemaleOneEighth","Female25Percent","Female50Percent","Female75Percent","FemaleSevenEighths"]);
const GENDER_RATIO_INDEX_PACKED = "54555554155555555555455555555555652555555535555255555555533515555551355053225553555555552555555555551535335553353355563555266655555336455655555555533525556553553535556535352555255555555555555555555355555555555555555355544524535355355555255553355555515535555131555555533153555055555555525525356555555555525255556665565555350333455554551411155555555550005555555555556103535335563551451555555525552255555555555555355555551557355555535525655554444554422245515555555553552555335522555515155625553505055535535555555011010565555555555555556535555555333555555555551555555535555553555552255322235355555675533333535555553555555553355555523055531355555055355355555555555335552555555555555553332255535565555555555555515535355635255555555355355552251555555555555355555355525555055535034111555333353335555555355551535535035255555355555315555550521655535555555555655555555155555555555553355";

export const SAFARI_GENERAL_SPECIES_INDIVIDUAL_FACTS_METADATA = Object.freeze({
  speciesCount: 875,
  firstSpeciesId: "ABOMASNOW",
  lastSpeciesId: "ZWEILOUS",
  canonicalFactsSha256: "3546f4d714738f72947f6d61d1bc876b0df4f0f72a45592c1e8f91eecbace1f8",
});

export function safariGeneralSpeciesIndividualFacts(speciesId, speciesIndex, speciesCount = 875) {
  const index = Number(speciesIndex);
  if (speciesCount !== SAFARI_GENERAL_SPECIES_INDIVIDUAL_FACTS_METADATA.speciesCount) {
    throw new Error(`Safari species individual fact count mismatch: ${speciesCount}`);
  }
  if (!Number.isInteger(index) || index < 0 || index >= GENDER_RATIO_INDEX_PACKED.length) {
    throw new RangeError(`Safari species individual fact index out of range: ${speciesIndex}`);
  }
  const id = String(speciesId ?? "");
  if (index === 0 && id !== SAFARI_GENERAL_SPECIES_INDIVIDUAL_FACTS_METADATA.firstSpeciesId) {
    throw new Error(`Safari species individual fact ordering mismatch at first species: ${id}`);
  }
  if (index === GENDER_RATIO_INDEX_PACKED.length - 1 && id !== SAFARI_GENERAL_SPECIES_INDIVIDUAL_FACTS_METADATA.lastSpeciesId) {
    throw new Error(`Safari species individual fact ordering mismatch at last species: ${id}`);
  }
  const genderRatio = GENDER_RATIO_IDS[Number(GENDER_RATIO_INDEX_PACKED[index])];
  if (!genderRatio) throw new Error(`Safari species gender ratio mismatch for ${id}`);
  return Object.freeze({ gender_ratio: genderRatio });
}
