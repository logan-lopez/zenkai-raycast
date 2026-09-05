import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getUserDir } from "../lib/prefs";
import { loadCharacterIndex, type CharacterRow } from "../lib/st";

export const ALL_TAGS = "__all__";
/** Dropdown entries beyond this are noise; the search bar still matches every tag via keywords. */
const DROPDOWN_TAG_LIMIT = 60;

/** Shared state for the list and grid commands: cached index, tag dropdown, tag filtering. */
export function useCharacters() {
  const userDir = getUserDir();
  const { data, isLoading, error, revalidate } = useCachedPromise(loadCharacterIndex, [userDir], {
    keepPreviousData: true,
  });
  const [tag, setTag] = useState<string>(ALL_TAGS);

  const characters = useMemo<CharacterRow[]>(() => {
    const all = data?.characters ?? [];
    if (tag === ALL_TAGS) return all;
    return all.filter((c) => c.tags.some((t) => t.toLowerCase() === tag));
  }, [data, tag]);

  const dropdownTags = useMemo(() => (data?.tagCounts ?? []).slice(0, DROPDOWN_TAG_LIMIT), [data]);

  return {
    userDir,
    userName: data?.userName,
    characters,
    total: data?.characters.length ?? 0,
    dropdownTags,
    tag,
    setTag,
    isLoading,
    error,
    revalidate,
  };
}

/** Search keywords so the native filter matches tags, creator and filename, not only the display name. */
export function searchKeywords(c: CharacterRow): string[] {
  const words = [...c.tags, c.creator ?? "", c.stem !== c.name ? c.stem : ""].filter(Boolean);
  return [...new Set(words)];
}
