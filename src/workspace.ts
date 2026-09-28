import path from "path";
import { statSync } from "fs";
import * as fs from "fs/promises";

let root = process.cwd();

export const getRoot = () => root;

export function setRoot(dir: string): void {
  const full = path.resolve(dir);
  if (!statSync(full, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Not a directory: ${dir}`);
  }
  root = full;
  process.chdir(root);
}

/** Resolve a path against the workspace root; reject anything outside it. */
export function resolveInside(p: string): string {
  const full = path.resolve(root, p);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error(`Path is outside the workspace: ${p}`);
  }
  return full;
}

const IGNORED = new Set(["node_modules", ".git", "dist", "build", ".next", "__pycache__", ".venv"]);

/** Indented file tree of a directory (skips heavy/generated folders). */
export async function buildTree(dir = root, maxDepth = 2, maxEntries = 150): Promise<string> {
  const lines: string[] = [];
  async function walk(current: string, depth: number) {
    if (depth > maxDepth || lines.length >= maxEntries) return;
    const entries = (await fs.readdir(current, { withFileTypes: true }))
      .filter((e) => !IGNORED.has(e.name))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    for (const e of entries) {
      if (lines.length >= maxEntries) return;
      lines.push(`${"  ".repeat(depth)}${e.name}${e.isDirectory() ? "/" : ""}`);
      if (e.isDirectory()) await walk(path.join(current, e.name), depth + 1);
    }
  }
  await walk(dir, 0);
  return lines.join("\n") || "(empty)";
}

/** Inline the contents of `@path/to/file` mentions found in a prompt. */
export async function expandMentions(prompt: string): Promise<string> {
  const mentions = [...new Set([...prompt.matchAll(/@([\w./-]+)/g)].map((m) => m[1]))];
  const blocks: string[] = [];
  for (const m of mentions) {
    try {
      const full = resolveInside(m);
      if (!(await fs.stat(full)).isFile()) continue;
      blocks.push(`--- ${m} ---\n${await fs.readFile(full, "utf-8")}`);
    } catch {
      /* not a file in the workspace, leave the text as-is */
    }
  }
  return blocks.length ? `${prompt}\n\nReferenced files:\n${blocks.join("\n\n")}` : prompt;
}