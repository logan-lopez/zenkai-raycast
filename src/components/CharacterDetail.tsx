import { Action, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { ParsedCharacterCard } from "@st-mcp/core";
import { CharacterActions } from "./CharacterActions";
import { CharacterChats } from "./CharacterChats";
import { formatDate, loadCard, renderMacros, type CharacterRow } from "../lib/st";

const SECTION_LIMIT = 4000;

function clip(text: string): string {
  return text.length > SECTION_LIMIT ? `${text.slice(0, SECTION_LIMIT)}\n\n*… truncated*` : text;
}

function section(title: string, body: string | undefined): string {
  const text = body?.trim();
  return text ? `## ${title}\n\n${clip(text)}\n\n` : "";
}

/** Markdown body shared by the inline list pane and the pushed full-page view. */
export function cardMarkdown(row: CharacterRow, card: ParsedCharacterCard | undefined, userName?: string): string {
  const img = `<img src="${row.thumbPath}" alt="${row.name}" height="220" />`;
  if (!card) {
    return `# ${row.name}\n\n${img}\n\n${row.parseError ? `*Card could not be parsed: ${row.parseError}*` : "*Loading card…*"}`;
  }
  const r = (t?: string) => (t ? renderMacros(t, card.name, userName) : t);
  const greetings = (card.alternateGreetings ?? []).filter((g) => g.trim());
  return [
    `# ${card.name}\n\n${img}\n\n`,
    section("Description", r(card.description)),
    section("Personality", r(card.personality)),
    section("Scenario", r(card.scenario)),
    section("First Message", r(card.firstMessage)),
    greetings.length
      ? section(
          `Alternate Greetings (${greetings.length})`,
          greetings.map((g, i) => `**${i + 1}.** ${r(g)}`).join("\n\n---\n\n"),
        )
      : "",
    section("Creator Notes", card.creatorNotes),
    section("System Prompt", r(card.systemPrompt)),
    section("Post-History Instructions", r(card.postHistoryInstructions)),
    section("Example Messages", r(card.messageExample)),
  ].join("");
}

interface MetadataProps {
  row: CharacterRow;
  card?: ParsedCharacterCard;
}

/** Metadata column shared by List.Item.Detail and Detail; the two namespaces have identical children. */
export function cardMetadata(
  M: typeof Detail.Metadata | typeof List.Item.Detail.Metadata,
  { row, card }: MetadataProps,
) {
  const tags = card?.tags?.filter((t) => t.trim()) ?? row.tags;
  return (
    <M>
      <M.Label title="Chats" text={String(row.chatCount)} icon={Icon.SpeechBubble} />
      <M.Label title="Modified" text={formatDate(row.lastModified)} icon={Icon.Calendar} />
      {row.creator && <M.Label title="Creator" text={row.creator} />}
      {row.characterVersion && <M.Label title="Version" text={row.characterVersion} />}
      {row.specVersion && <M.Label title="Spec" text={row.specVersion.toUpperCase()} />}
      {card?.characterBook ? <M.Label title="Lorebook" text="Embedded" icon={Icon.Book} /> : null}
      {greetingCount(card) > 0 && <M.Label title="Alt. greetings" text={String(greetingCount(card))} />}
      {tags.length > 0 && (
        <>
          <M.Separator />
          <M.TagList title="Tags">
            {tags.map((t) => (
              <M.TagList.Item key={t} text={t} />
            ))}
          </M.TagList>
        </>
      )}
      <M.Separator />
      <M.Label title="Handle" text={row.handle} />
    </M>
  );
}

function greetingCount(card?: ParsedCharacterCard): number {
  return card?.alternateGreetings?.filter((g) => g.trim()).length ?? 0;
}

interface Props {
  userDir: string;
  character: CharacterRow;
  userName?: string;
}

/** Full-page card view, pushed from the grid (and from the list via ⏎). */
export function CharacterDetail({ userDir, character, userName }: Props) {
  const { data: card, isLoading } = useCachedPromise(loadCard, [userDir, character.stem]);
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={character.name}
      markdown={cardMarkdown(character, card, userName)}
      metadata={cardMetadata(Detail.Metadata, { row: character, card })}
      actions={
        <CharacterActions
          userDir={userDir}
          character={character}
          primary={
            <Action.Push
              title={`Browse Chats (${character.chatCount})`}
              icon={Icon.SpeechBubble}
              target={<CharacterChats userDir={userDir} character={character} />}
            />
          }
        />
      }
    />
  );
}
