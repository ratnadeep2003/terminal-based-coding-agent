#!/usr/bin/env node

import { fileURLToPath } from "url";
import path from "path";

import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { GoogleGenAI, type Content } from "@google/genai";
import * as dotenv from "dotenv";

// Find the directory of this script, and load .env from the agent's folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });


import chalk from "chalk";
import { tools, executeTool } from "./tools.js";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startAgentApp() {
  const rl = readline.createInterface({ input, output });

  // Conversation history persists across turns
  const history: Content[] = [];

  console.clear();
  console.log(chalk.bold.cyan("============================================="));
  console.log(chalk.bold.cyan("         🤖 Terminal Coding Agent            "));
  console.log(chalk.dim(` Working directory: ${process.cwd()}`));
  console.log(chalk.dim(" Type 'exit' to quit, or '/clear' to reset."));
  console.log(chalk.bold.cyan("=============================================\n"));

  while (true) {
    const userPrompt = await rl.question(chalk.bold.green("\nYou: "));

    if (!userPrompt.trim()) continue;

    if (userPrompt.trim().toLowerCase() === "exit") {
      console.log(chalk.yellow("Goodbye!"));
      rl.close();
      process.exit(0);
    }

    if (userPrompt.trim().toLowerCase() === "/clear") {
      history.length = 0;
      console.clear();
      console.log(chalk.yellow("🧹 Context reset."));
      continue;
    }

    // Add user's prompt to history
    history.push({ role: "user", parts: [{ text: userPrompt }] });

    // Inner Agent Execution Loop
    while (true) {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: history,
        config: {
          systemInstruction: `You are an autonomous CLI coding assistant operating directly in ${process.cwd()}.
Inspect files, write code, run commands, and verify changes. Always explain what you did clearly.`,
          tools: [{ functionDeclarations: tools }],
        },
      });

      const candidate = response.candidates?.[0];
      if (!candidate || !candidate.content) {
        console.log(chalk.red("No response received from model."));
        break;
      }

      // Extract tool calls
      const functionCalls = (candidate.content.parts || [])
        .map((p) => p.functionCall)
        .filter((call): call is NonNullable<typeof call> => Boolean(call && call.name));

      // If no tool call, Gemini has finished the turn
      if (functionCalls.length === 0) {
        console.log(chalk.bold.blue("\nAgent:\n") + response.text);
        // Save final answer to history
        history.push(candidate.content);
        break;
      }

      // Save intermediate action
      history.push(candidate.content);

      // Execute tool calls
      for (const call of functionCalls) {
        const callName = call.name ?? "unknown_tool";
        const callArgs = (call.args as Record<string, any>) ?? {};

        console.log(chalk.yellow(`\n⚙ Tool Call: ${callName}(${JSON.stringify(callArgs)})`));

        const output = await executeTool(callName, callArgs);
        console.log(chalk.dim(`↳ Output: ${String(output).slice(0, 150)}...`));

        // Feed tool result back to Gemini
        history.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: callName,
                response: { result: output },
              },
            },
          ],
        });
      }
    }
  }
}

startAgentApp();