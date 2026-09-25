import { Type, type FunctionDeclaration } from "@google/genai";
import type Anthropic from "@anthropic-ai/sdk";

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