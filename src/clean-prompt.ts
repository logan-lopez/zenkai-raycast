import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { clean } from "./clean";
import { showFailureToast } from "@raycast/utils";

function roughToTokens(chars: number) {
  return chars * 4;
}

function compare(a: string, b: string) {
  return {
    roughTokensLost: roughToTokens(a.length) - roughToTokens(b.length)
  };
}

export default async function Command() {
  let text: string | undefined;
  let fromSelection = false;

  text = await Clipboard.readText();
  fromSelection = false;

  if (!text || text.trim() === "") {
    await showHUD("Nothing to clean");
    return;
  }

  const cleaned = clean(text);

  if (cleaned === text) {
    await showHUD("Already clean");
    return;
  }

  if (fromSelection) {
    await Clipboard.paste(cleaned);
  } else {
    await Clipboard.copy(cleaned);
  }

  const compared = compare(text, cleaned);

  const trimmed = text.length - cleaned.length;

  await showHUD(`Cleaned · ${compared.roughTokensLost} tokens trimmed`);  // await showHUD(trimmed > 0 ? `Cleaned · ${trimmed} ${trimmed === 1 ? "char" : "chars"} trimmed` : "Cleaned");
}
