import { SAFARI_MOVE_PRESENTATION } from "./safari-web-playable-integration.js";

function moveLabel(moveId) {
  return SAFARI_MOVE_PRESENTATION?.[moveId]?.name ?? String(moveId);
}

export function createSafariBrowserMoveLearningResolver({ promptFn = globalThis.prompt } = {}) {
  if (typeof promptFn !== "function") return null;
  return ({ level, move, moves }) => {
    const learned = moveLabel(move);
    const current = moves.map((id, index) => `${index + 1}: ${moveLabel(id)}`).join("\n");
    const answer = promptFn(
      `Lv.${level}で「${learned}」を覚えようとしています。\n` +
      `技が4つあります。忘れさせる技の番号を1〜4で入力してください。\n` +
      `${current}\n` +
      `キャンセルまたは空欄なら「${learned}」を覚えません。`,
      "",
    );
    if (answer == null || String(answer).trim() === "") return { decline: true };
    const slot = Number(String(answer).trim()) - 1;
    if (!Number.isInteger(slot) || slot < 0 || slot >= moves.length) return { decline: true };
    return { forgetIndex: slot };
  };
}

export function installSafariBrowserMoveLearningResolver(target = globalThis) {
  const resolver = createSafariBrowserMoveLearningResolver({ promptFn: target?.prompt });
  if (resolver) target.__maplessSafariMoveLearningResolver = resolver;
  return resolver;
}
