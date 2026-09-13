import * as fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { Type, type FunctionDeclaration } from "@google/genai";

const execAsync = promisify(exec);

export const tools: FunctionDeclaration[] = [
  {
    name: "read_file",
    description: "Read content of a file",
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
    description: "Write or overwrite content to a file",
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
    name: "run_bash",
    description: "Run bash terminal commands (tests, git, ls, etc.)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, description: "The command line to execute" },
      },
      required: ["command"],
    },
  },
];

export async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  if (name === "read_file") {
    return await fs.readFile(args.path, "utf-8");
  } else if (name === "write_file") {
    await fs.writeFile(args.path, args.content, "utf-8");
    return `Successfully wrote to ${args.path}`;
  } else if (name === "run_bash") {
    try {
      const { stdout, stderr } = await execAsync(args.command);
      return stdout || stderr || "Command executed with no output.";
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  }
  throw new Error(`Unknown tool: ${name}`);
}