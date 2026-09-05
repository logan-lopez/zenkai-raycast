// Thin layer over @st-mcp/core for the Raycast UI. Everything here is
// read-only and rooted at the SillyTavern user directory (data/default-user).

import path from "node:path";
import fs from "node:fs/promises";
import {
  fs as stfs,
  listChatsForCharacter,
  parseCharacterCard,
  parseChatFile,
  parsePersonasFile,
  type ParsedCharacterCard,
} from "@st-mcp/core";

export interface CharacterRow {
  /** Avatar filename without .png — what ST keys the character by and what st-mcp's `char:` handle wraps. */
  stem: string;
  handle: string;
  name: string;
  tags: string[];
  creator?: string;
  characterVersion?: string;
  specVersion?: string;
  chatCount: number;
  /** ISO timestamp of the card file's last modification. */
  lastModified: string;
  /** Absolute path to the full-resolution card PNG. */
  avatarPath: string;
  /** Absolute path to ST's 480x720 thumbnail, or the full card if ST has not generated one. */
  thumbPath: string;
  /** Set when the embedded card could not be parsed; the row then only carries filename info. */
  parseError?: string;
}

export interface CharacterIndex {
  characters: CharacterRow[];
  /** Tag -> number of characters carrying it, sorted by count desc. */
  tagCounts: [string, number][];
  /** Display name of ST's default persona, used to render {{user}} in card text. */
  userName?: string;
}

export interface ChatRow {
  handle: string;
  chatId: string;
  fileName: string;
  path: string;
  messageCount: number;
  firstDate?: string;
  lastDate?: string;
  lastSpeaker?: string;
  /** Text of the last message, trimmed for a preview pane. */
  lastExcerpt?: string;
  /** File mtime; ST's sendDate strings are locale text, so this is what the list sorts by. */
  modifiedMs: number;
  truncated: boolean;
  error?: string;
}

export function characterFilePath(userDir: string, stem: string): string {
  return path.join(userDir, "characters", `${stem}.png`);
}

export function thumbnailFilePath(userDir: string, stem: string): string {
  return path.join(userDir, "thumbnails", "avatar", `${stem}.png`);
}

export function chatsFolderPath(userDir: string, stem: string): string {
  return path.join(userDir, "chats", stem);
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function defaultPersonaName(userDir: string): Promise<string | undefined> {
  try {
    const settings = JSON.parse(await stfs.readSettingsFile(userDir)) as {
      power_user?: { default_persona?: string };
    };
    const avatar = settings.power_user?.default_persona;
    const personas = await parsePersonasFile(userDir);
    return (avatar && personas.find((p) => p.avatarFile === avatar)?.name) || personas[0]?.name;
  } catch {
    return undefined;
  }
}

/** Parses every card under characters/ into a cheap index (no card bodies). ~1s for 400 cards. */
export async function loadCharacterIndex(userDir: string): Promise<CharacterIndex> {
  const files = await stfs.listCharacterFiles(userDir);

  const characters = await Promise.all(
    files.map(async (fileName): Promise<CharacterRow> => {
      const stem = fileName.toLowerCase().endsWith(".png") ? fileName.slice(0, -4) : fileName;
      const row: CharacterRow = {
        stem,
        handle: `char:${stem}`,
        name: stem,
        tags: [],
        chatCount: 0,
        lastModified: new Date(0).toISOString(),
        avatarPath: characterFilePath(userDir, stem),
        thumbPath: characterFilePath(userDir, stem),
      };

      try {
        const card = parseCharacterCard(await stfs.readCharacterFile(userDir, fileName));
        row.name = card.name || stem;
        row.tags = (card.tags ?? []).map((t) => t.trim()).filter(Boolean);
        row.creator = card.creator || undefined;
        row.characterVersion = card.characterVersion || undefined;
        row.specVersion = card.specVersion;
      } catch (e) {
        row.parseError = e instanceof Error ? e.message : String(e);
      }

      const [chats, stat, hasThumb] = await Promise.all([
        listChatsForCharacter(userDir, stem),
        stfs.statCharacterFile(userDir, fileName),
        exists(thumbnailFilePath(userDir, stem)),
      ]);
      row.chatCount = chats.length;
      row.lastModified = new Date(stat.mtimeMs).toISOString();
      if (hasThumb) row.thumbPath = thumbnailFilePath(userDir, stem);
      return row;
    }),
  );

  characters.sort((a, b) => b.lastModified.localeCompare(a.lastModified));

  const counts = new Map<string, number>();
  for (const c of characters) {
    for (const t of new Set(c.tags.map((t) => t.toLowerCase()))) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const tagCounts = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return { characters, tagCounts, userName: await defaultPersonaName(userDir) };
}

/** Reads and parses one full card. */
export async function loadCard(userDir: string, stem: string): Promise<ParsedCharacterCard> {
  return parseCharacterCard(await stfs.readCharacterFile(userDir, `${stem}.png`));
}

const EXCERPT_CHARS = 700;

/** Lists a character's chats with per-file stats, newest activity first. */
export async function loadChats(userDir: string, stem: string): Promise<ChatRow[]> {
  const refs = await listChatsForCharacter(userDir, stem);
  const rows = await Promise.all(
    refs.map(async (ref): Promise<ChatRow> => {
      const row: ChatRow = {
        handle: ref.handle,
        chatId: ref.chatId,
        fileName: ref.fileName,
        path: path.join(chatsFolderPath(userDir, stem), ref.fileName),
        messageCount: 0,
        modifiedMs: 0,
        truncated: false,
      };
      try {
        const [chat, stat] = await Promise.all([
          parseChatFile(userDir, stem, ref.fileName),
          stfs.statChatFile(userDir, stem, ref.fileName),
        ]);
        row.modifiedMs = stat.mtimeMs;
        const msgs = chat.messages;
        const last = msgs[msgs.length - 1];
        row.messageCount = msgs.length;
        row.truncated = chat.truncated;
        row.firstDate = msgs[0]?.sendDate ?? chat.metadata.createDate;
        row.lastDate = last?.sendDate;
        row.lastSpeaker = last?.name;
        if (last) {
          const text = last.text.trim();
          row.lastExcerpt = text.length > EXCERPT_CHARS ? `${text.slice(0, EXCERPT_CHARS)}…` : text;
        }
      } catch (e) {
        row.error = e instanceof Error ? e.message : String(e);
      }
      return row;
    }),
  );
  return rows.sort((a, b) => b.modifiedMs - a.modifiedMs || b.chatId.localeCompare(a.chatId));
}

/** Replaces the two macros that make card text unreadable when left raw. */
export function renderMacros(text: string, charName: string, userName?: string): string {
  return text.replace(/\{\{char\}\}/gi, charName).replace(/\{\{user\}\}/gi, userName ?? "{{user}}");
}

export function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
