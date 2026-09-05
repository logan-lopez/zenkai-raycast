import { getPreferenceValues } from "@raycast/api";
import os from "node:os";
import path from "node:path";

interface Prefs {
  userDir?: string;
  stUrl?: string;
}

const DEFAULT_USER_DIR = "~/SillyTavern-Launcher/SillyTavern/data/default-user";
const DEFAULT_ST_URL = "http://localhost:8000";

function expandHome(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

/** Absolute path to the SillyTavern user directory (data/default-user), from preferences. */
export function getUserDir(): string {
  const prefs = getPreferenceValues<Prefs>();
  const raw = prefs.userDir?.trim() || DEFAULT_USER_DIR;
  return path.resolve(expandHome(raw));
}

/** Base URL of the running SillyTavern web UI, from preferences. */
export function getStUrl(): string {
  const prefs = getPreferenceValues<Prefs>();
  return (prefs.stUrl?.trim() || DEFAULT_ST_URL).replace(/\/+$/, "");
}
