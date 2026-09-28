import * as fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { getRoot, resolveInside } from "../workspace.js";

const execAsync = promisify(exec);

export async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  if (name === "read_file") {
    try {
      return await fs.readFile(resolveInside(args.path), "utf-8");
    } catch (err: any) {
      return `Error reading file ${args.path}: ${err.message}`;
    }
  } else if (name === "write_file") {
    try {
      const full = resolveInside(args.path);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, args.content, "utf-8");
      return `Successfully wrote to ${args.path}`;
    } catch (err: any) {
      return `Error writing file ${args.path}: ${err.message}`;
    }
  } else if (name === "edit_file") {
    try {
      const full = resolveInside(args.path);
      const content = await fs.readFile(full, "utf-8");
      const occurrences = content.split(args.target).length - 1;
      if (occurrences === 0) {
        return `Error: Target string not found in ${args.path}. Ensure exact characters, indentation, and newlines match.`;
      }
      if (occurrences > 1) {
        return `Error: Target string found ${occurrences} times in ${args.path}. Include more surrounding context in target to uniquely identify the block to replace.`;
      }
      const updated = content.replace(args.target, args.replacement);
      await fs.writeFile(full, updated, "utf-8");
      return `Successfully edited ${args.path}`;
    } catch (err: any) {
      return `Error editing file ${args.path}: ${err.message}`;
    }
  } else if (name === "list_dir") {
    try {
      const entries = await fs.readdir(resolveInside(args.path || "."), { withFileTypes: true });
      return entries.map((e) => e.name + (e.isDirectory() ? "/" : "")).join("\n") || "(empty directory)";
    } catch (err: any) {
      return `Error listing ${args.path || "."}: ${err.message}`;
    }
  } else if (name === "run_bash") {
    try {
      const { stdout, stderr } = await execAsync(args.command, { cwd: getRoot(), maxBuffer: 10 * 1024 * 1024 });
      const out = stdout ? stdout.trim() : "";
      const err = stderr ? stderr.trim() : "";
      if (out && err) return `${out}\n[stderr]:\n${err}`;
      return out || err || "Command executed with no output.";
    } catch (err: any) {
      const stdout = err.stdout ? `\nStdout:\n${err.stdout}` : "";
      const stderr = err.stderr ? `\nStderr:\n${err.stderr}` : "";
      return `Command failed: ${err.message}${stdout}${stderr}`;
    }
  }
  return `Error: Unknown tool "${name}"`;
}