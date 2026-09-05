import { Action, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { CharacterActions } from "./components/CharacterActions";
import { CharacterChats } from "./components/CharacterChats";
import { CharacterDetail, cardMarkdown, cardMetadata } from "./components/CharacterDetail";
import { ALL_TAGS, searchKeywords, useCharacters } from "./components/useCharacters";
import { formatDate, loadCard, type CharacterRow } from "./lib/st";

const ACCESSORY_TAG_LIMIT = 3;

export default function Command() {
  const { userDir, userName, characters, total, dropdownTags, tag, setTag, isLoading, error, revalidate } =
    useCharacters();

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={characters.length > 0}
      searchBarPlaceholder={`Search ${total || ""} characters by name, tag or creator…`}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tag" value={tag} onChange={setTag}>
          <List.Dropdown.Item title="All tags" value={ALL_TAGS} icon={Icon.Tag} />
          <List.Dropdown.Section title="Tags">
            {dropdownTags.map(([t, n]) => (
              <List.Dropdown.Item key={t} title={`${t} (${n})`} value={t} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not read the SillyTavern user directory"
          description={`${error.message}\n${userDir}`}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Person}
          title="No characters"
          description="Nothing matches this search and tag filter."
        />
      )}
      {characters.map((c) => (
        <CharacterItem key={c.stem} userDir={userDir} character={c} userName={userName} onRefresh={revalidate} />
      ))}
    </List>
  );
}

interface ItemProps {
  userDir: string;
  character: CharacterRow;
  userName?: string;
  onRefresh: () => void;
}

function CharacterItem({ userDir, character, userName, onRefresh }: ItemProps) {
  return (
    <List.Item
      id={character.stem}
      icon={{ source: character.thumbPath, fallback: Icon.Person }}
      title={character.name}
      subtitle={character.creator}
      keywords={searchKeywords(character)}
      quickLook={{ path: character.avatarPath, name: character.name }}
      accessories={[
        ...character.tags.slice(0, ACCESSORY_TAG_LIMIT).map((t) => ({ tag: t })),
        { text: String(character.chatCount), icon: Icon.SpeechBubble, tooltip: "Chats" },
        { date: new Date(character.lastModified), tooltip: `Modified ${formatDate(character.lastModified)}` },
      ]}
      detail={<ItemDetail userDir={userDir} character={character} userName={userName} />}
      actions={
        <CharacterActions
          userDir={userDir}
          character={character}
          primary={
            <Action.Push
              title="Open Card"
              icon={Icon.Eye}
              target={<CharacterDetail userDir={userDir} character={character} userName={userName} />}
            />
          }
          secondary={
            <>
              <Action.Push
                title={`Browse Chats (${character.chatCount})`}
                icon={Icon.SpeechBubble}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                target={<CharacterChats userDir={userDir} character={character} />}
              />
              <Action
                title="Refresh Index"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={onRefresh}
              />
            </>
          }
        />
      }
    />
  );
}

function ItemDetail({ userDir, character, userName }: Omit<ItemProps, "onRefresh">) {
  const { data: card, isLoading } = useCachedPromise(loadCard, [userDir, character.stem]);
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={cardMarkdown(character, card, userName)}
      metadata={cardMetadata(List.Item.Detail.Metadata, { row: character, card })}
    />
  );
}
