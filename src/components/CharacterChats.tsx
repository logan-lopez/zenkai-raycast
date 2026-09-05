import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getStUrl } from "../lib/prefs";
import { chatsFolderPath, formatDate, loadChats, type CharacterRow, type ChatRow } from "../lib/st";

interface Props {
  userDir: string;
  character: CharacterRow;
}

function chatMarkdown(chat: ChatRow): string {
  if (chat.error) return `*Could not read this chat: ${chat.error}*`;
  if (!chat.lastExcerpt) return "*Empty chat*";
  return `**${chat.lastSpeaker ?? "?"}** · ${formatDate(chat.lastDate)}\n\n${chat.lastExcerpt}`;
}

/** Every chat file for one character, newest activity first, with the tail of each as a preview. */
export function CharacterChats({ userDir, character }: Props) {
  const { data, isLoading } = useCachedPromise(loadChats, [userDir, character.stem]);
  const chats = data ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={chats.length > 0}
      navigationTitle={`${character.name} · Chats`}
      searchBarPlaceholder="Filter chats by name…"
    >
      <List.EmptyView
        icon={Icon.SpeechBubble}
        title="No chats yet"
        description={`${character.name} has no chat files.`}
      />
      {chats.map((chat) => (
        <List.Item
          key={chat.handle}
          icon={{ source: Icon.SpeechBubble, tintColor: chat.error ? Color.Red : Color.SecondaryText }}
          title={chat.chatId}
          accessories={[
            { text: String(chat.messageCount), icon: Icon.Message, tooltip: "Messages" },
            ...(chat.truncated ? [{ icon: Icon.Warning, tooltip: "Trailing torn write dropped" }] : []),
          ]}
          detail={
            <List.Item.Detail
              markdown={chatMarkdown(chat)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Messages" text={String(chat.messageCount)} />
                  <List.Item.Detail.Metadata.Label title="Started" text={formatDate(chat.firstDate)} />
                  <List.Item.Detail.Metadata.Label title="Last activity" text={formatDate(chat.lastDate)} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Handle" text={chat.handle} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open SillyTavern" url={getStUrl()} icon={Icon.Globe} />
              <Action.ShowInFinder title="Reveal Chat File" path={chat.path} />
              <Action.ShowInFinder title="Reveal Chats Folder" path={chatsFolderPath(userDir, character.stem)} />
              <Action.CopyToClipboard
                title="Copy Chat Name"
                content={chat.chatId}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Handle"
                content={chat.handle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard title="Copy File Path" content={chat.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
