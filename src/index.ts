#!/usr/bin/env node

import { fileURLToPath } from "url";
import path from "path";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import * as dotenv from "dotenv";
import chalk from "chalk";
import ora from "ora";

// Find the directory of this script, and load .env from the agent's folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config(); // fallback to cwd .env

import { executeTool } from "./tools.js";
import { createProvider, type LLMProvider } from "./provider.js";

async function startAgentApp() {
  const rl = readline.createInterface({ input, output });

  let provider: LLMProvider;
  try {
    provider = createProvider();
  } catch (err: any) {
    console.error(chalk.red.bold("\n❌ Initialization Error:"), err.message);
    console.log(chalk.yellow("Please ensure GEMINI_API_KEY or ANTHROPIC_API_KEY is configured in your .env file.\n"));
    rl.close();
    process.exit(1);
  }

  console.clear();
  console.log(chalk.bold.cyan("============================================="));
  console.log(chalk.bold.cyan("         🤖 Terminal Coding Agent            "));
  console.log(chalk.dim(` Provider:         ${provider.name.toUpperCase()} (${provider.model})`));
  console.log(chalk.dim(` Working directory: ${process.cwd()}`));
  console.log(chalk.dim(" Type 'exit' to quit, or '/clear' to reset."));
  console.log(chalk.bold.cyan("=============================================\n"));

  const systemInstruction = `You are an autonomous CLI coding assistant operating directly in ${process.cwd()}.
You have access to tools to read files, write files (with automatic directory creation), edit files (exact text replacement), and run bash commands.
Always think step-by-step before taking action. Verify changes by inspecting files or running commands.`;

  while (true) {
    let userPrompt: string;
    try {
      userPrompt = await rl.question(chalk.bold.green("\nYou: "));
    } catch {
      break;
    }

    if (!userPrompt.trim()) continue;

    const trimmed = userPrompt.trim().toLowerCase();
    if (trimmed === "exit" || trimmed === "quit") {
      console.log(chalk.yellow("Goodbye!"));
      rl.close();
      process.exit(0);
    }

    if (trimmed === "/clear") {
      provider.resetContext();
      console.clear();
      console.log(chalk.yellow("🧹 Context reset. Conversation history cleared."));
      continue;
    }

    // Add user's prompt to provider history
    provider.addUserMessage(userPrompt);

    const spinner = ora({
      text: chalk.dim("Thinking..."),
      color: "cyan",
    });

    // Inner ReAct Execution Loop
    let turnCount = 0;
    const maxTurns = 25;

    while (turnCount < maxTurns) {
      turnCount++;
      spinner.start();

      let stepResult;
      try {
        stepResult = await provider.generateStep(systemInstruction);
      } catch (err: any) {
        spinner.stop();
        console.log(chalk.red.bold(`\n❌ Error during execution: ${err.message}`));
        break;
      }
      spinner.stop();

      // Display model's thinking process if present
      if (stepResult.thinking) {
        console.log(chalk.bold.magenta("\n💭 Thinking:"));
        console.log(chalk.dim(stepResult.thinking));
      }

      // If no tool calls, Gemini/Anthropic has finished the task
      if (stepResult.toolCalls.length === 0) {
        if (stepResult.text) {
          console.log(chalk.bold.blue("\nAgent:\n") + stepResult.text);
        }
        break;
      }

      // If text preceded the tool call, show it
      if (stepResult.text) {
        console.log(chalk.bold.blue("\nAgent: ") + stepResult.text);
      }

      // Execute all tool calls
      const toolResults: Array<{ id?: string; name: string; output: string }> = [];

      for (const call of stepResult.toolCalls) {
        const callName = call.name;
        const callArgs = call.args || {};

        console.log(chalk.yellow(`\n⚙ Tool Call: ${callName}(${JSON.stringify(callArgs)})`));

        const toolSpinner = ora({
          text: chalk.dim(`Executing ${callName}...`),
          color: "yellow",
        }).start();

        const output = await executeTool(callName, callArgs);
        toolSpinner.stop();

        const preview = output.length > 300 ? output.slice(0, 300) + "... [truncated]" : output;
        console.log(chalk.dim(`↳ Output: ${preview}`));

        toolResults.push({
          id: call.id,
          name: callName,
          output,
        });
      }

      // Feed all tool results back into history as a single turn
      provider.addToolResults(toolResults);
    }

    if (turnCount >= maxTurns) {
      console.log(chalk.yellow("\n⚠️ Reached maximum turn limit for this prompt."));
    }
  }
}

startAgentApp();