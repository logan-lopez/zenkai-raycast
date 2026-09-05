import { Action, ActionPanel, Icon } from "@raycast/api";
import type { ReactNode } from "react";
import { getStUrl } from "../lib/prefs";
import { chatsFolderPath, type CharacterRow } from "../lib/st";

interface Props {
  userDir: string;
  character: CharacterRow;
  /** Rendered first, e.g. a Push into the detail or chats view. */
  primary?: ReactNode;
  /** Rendered after the primary action, e.g. the "Chats" push from the detail view. */
  secondary?: ReactNode;
}

/** Actions shared by the list, grid and detail views for one character. */
export function CharacterActions({ userDir, character, primary, secondary }: Props) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {primary}
        {secondary}
        <Action.ToggleQuickLook title="Quick Look Card Art" shortcut={{ modifiers: ["cmd"], key: "y" }} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Open">
        <Action.OpenInBrowser
          title="Open SillyTavern"
          url={getStUrl()}
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <Action.ShowInFinder
          title="Reveal Card in Finder"
          path={character.avatarPath}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        />
        {character.chatCount > 0 && (
          <Action.ShowInFinder title="Reveal Chats Folder" path={chatsFolderPath(userDir, character.stem)} />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Name"
          content={character.name}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Handle"
          content={character.handle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard title="Copy Card Path" content={character.avatarPath} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
