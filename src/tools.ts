import * as fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { Type, type FunctionDeclaration } from "@google/genai";
import type Anthropic from "@anthropic-ai/sdk";

const execAsync = promisify(exec);

// ============================================================================
// Tool Definitions for Google Gemini
// ============================================================================
export const tools: FunctionDeclaration[] = [
  {
    name: "read_file",
    description: "Read content of a file from the workspace",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Relative or absolute path to the file" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write or overwrite content to a file. Automatically creates any missing parent directories.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Path to write to" },
        content: { type: Type.STRING, description: "New file content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Replace a specific target string or code block in a file with new replacement content. The target string must match exactly.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: "Path to the file to edit" },
        target: { type: Type.STRING, description: "The exact existing text or code snippet to replace" },
        replacement: { type: Type.STRING, description: "The new replacement text or code" },
      },
      required: ["path", "target", "replacement"],
    },
  },
  {
    name: "run_bash",
    description: "Run bash terminal commands (tests, git, build, ls, etc.)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, description: "The command line string to execute" },
      },
      required: ["command"],
    },
  },
];

// ============================================================================
// Tool Definitions for Anthropic Claude
// ============================================================================
export const anthropicTools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read content of a file from the workspace",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative or absolute path to the file" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write or overwrite content to a file. Automatically creates any missing parent directories.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to write to" },
        content: { type: "string", description: "New file content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Replace a specific target string or code block in a file with new replacement content. The target string must match exactly.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file to edit" },
        target: { type: "string", description: "The exact existing text or code snippet to replace" },
        replacement: { type: "string", description: "The new replacement text or code" },
      },
      required: ["path", "target", "replacement"],
    },
  },
  {
    name: "run_bash",
    description: "Run bash terminal commands (tests, git, build, ls, etc.)",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "The command line string to execute" },
      },
      required: ["command"],
    },
  },
];

// ============================================================================
// Safe Tool Executor
// ============================================================================
export async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  if (name === "read_file") {
    try {
      return await fs.readFile(args.path, "utf-8");
    } catch (err: any) {
      return `Error reading file ${args.path}: ${err.message}`;
    }
  } else if (name === "write_file") {
    try {
      const dir = path.dirname(args.path);
      if (dir && dir !== ".") {
        await fs.mkdir(dir, { recursive: true });
      }
      await fs.writeFile(args.path, args.content, "utf-8");
      return `Successfully wrote to ${args.path}`;
    } catch (err: any) {
      return `Error writing file ${args.path}: ${err.message}`;
    }
  } else if (name === "edit_file") {
    try {
      const content = await fs.readFile(args.path, "utf-8");
      const occurrences = content.split(args.target).length - 1;
      if (occurrences === 0) {
        return `Error: Target string not found in ${args.path}. Ensure exact characters, indentation, and newlines match.`;
      }
      if (occurrences > 1) {
        return `Error: Target string found ${occurrences} times in ${args.path}. Include more surrounding context in target to uniquely identify the block to replace.`;
      }
      const updated = content.replace(args.target, args.replacement);
      await fs.writeFile(args.path, updated, "utf-8");
      return `Successfully edited ${args.path}`;
    } catch (err: any) {
      return `Error editing file ${args.path}: ${err.message}`;
    }
  } else if (name === "run_bash") {
    try {
      const { stdout, stderr } = await execAsync(args.command, { maxBuffer: 10 * 1024 * 1024 });
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