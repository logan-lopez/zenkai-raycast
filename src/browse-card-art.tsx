import { Action, Color, Grid, Icon } from "@raycast/api";
import { CharacterActions } from "./components/CharacterActions";
import { CharacterChats } from "./components/CharacterChats";
import { CharacterDetail } from "./components/CharacterDetail";
import { ALL_TAGS, searchKeywords, useCharacters } from "./components/useCharacters";

const COLUMNS = 6;

export default function Command() {
  const { userDir, userName, characters, total, dropdownTags, tag, setTag, isLoading, error, revalidate } =
    useCharacters();

  return (
    <Grid
      isLoading={isLoading}
      columns={COLUMNS}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      searchBarPlaceholder={`Search ${total || ""} cards by name, tag or creator…`}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by tag" value={tag} onChange={setTag}>
          <Grid.Dropdown.Item title="All tags" value={ALL_TAGS} icon={Icon.Tag} />
          <Grid.Dropdown.Section title="Tags">
            {dropdownTags.map(([t, n]) => (
              <Grid.Dropdown.Item key={t} title={`${t} (${n})`} value={t} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {error ? (
        <Grid.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not read the SillyTavern user directory"
          description={`${error.message}\n${userDir}`}
        />
      ) : (
        <Grid.EmptyView
          icon={Icon.Person}
          title="No characters"
          description="Nothing matches this search and tag filter."
        />
      )}
      {characters.map((c) => (
        <Grid.Item
          key={c.stem}
          id={c.stem}
          content={{ source: c.thumbPath, fallback: Icon.Person }}
          title={c.name}
          subtitle={c.creator ?? (c.chatCount ? `${c.chatCount} chats` : undefined)}
          keywords={searchKeywords(c)}
          quickLook={{ path: c.avatarPath, name: c.name }}
          actions={
            <CharacterActions
              userDir={userDir}
              character={c}
              primary={
                <Action.Push
                  title="Open Card"
                  icon={Icon.Eye}
                  target={<CharacterDetail userDir={userDir} character={c} userName={userName} />}
                />
              }
              secondary={
                <>
                  <Action.Push
                    title={`Browse Chats (${c.chatCount})`}
                    icon={Icon.SpeechBubble}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    target={<CharacterChats userDir={userDir} character={c} />}
                  />
                  <Action
                    title="Refresh Index"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </>
              }
            />
          }
        />
      ))}
    </Grid>
  );
}
