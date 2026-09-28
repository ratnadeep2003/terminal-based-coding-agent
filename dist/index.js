#!/usr/bin/env node
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { loadEnv } from "./config.js";
import { createProvider } from "./providers/index.js";
import { executeTool } from "./tools/index.js";
import { getRoot, setRoot, buildTree, expandMentions } from "./workspace.js";
import * as ui from "./ui.js";
loadEnv();
async function startAgentApp() {
    const rl = readline.createInterface({ input, output });
    let provider;
    try {
        provider = createProvider();
    }
    catch (err) {
        ui.printInitError(err.message);
        rl.close();
        process.exit(1);
    }
    // `code-agent ./my-project` opens that folder as the workspace
    const dirArg = process.argv[2];
    if (dirArg) {
        try {
            setRoot(dirArg);
        }
        catch (err) {
            ui.printInitError(err.message);
            rl.close();
            process.exit(1);
        }
    }
    ui.printBanner(provider.name, provider.model, getRoot());
    const buildSystemInstruction = async () => `You are an autonomous CLI coding assistant. Your workspace root is ${getRoot()}.
All file paths are relative to it and cannot escape it; bash commands run inside it.
You have tools to list directories, read files, write files (with automatic directory creation), edit files (exact text replacement), and run bash commands.
Explore with list_dir/read_file before editing. Always think step-by-step before taking action. Verify changes by inspecting files or running commands.

Project structure (2 levels deep):
${await buildTree()}`;
    let systemInstruction = await buildSystemInstruction();
    while (true) {
        let userPrompt;
        try {
            userPrompt = await rl.question("\nYou: ");
        }
        catch {
            break;
        }
        if (!userPrompt.trim())
            continue;
        const trimmed = userPrompt.trim().toLowerCase();
        if (trimmed === "exit" || trimmed === "quit") {
            ui.printGoodbye();
            rl.close();
            process.exit(0);
        }
        if (trimmed === "/clear") {
            provider.resetContext();
            ui.printContextCleared();
            continue;
        }
        if (trimmed.startsWith("/open")) {
            const dir = userPrompt.trim().slice(5).trim();
            try {
                if (!dir)
                    throw new Error("Usage: /open <directory>");
                setRoot(dir);
                provider.resetContext();
                systemInstruction = await buildSystemInstruction();
                ui.printWorkspaceOpened(getRoot());
            }
            catch (err) {
                ui.printError(err.message);
            }
            continue;
        }
        // Inline any @path/to/file mentions so the model sees them immediately
        provider.addUserMessage(await expandMentions(userPrompt));
        // Inner ReAct execution loop
        let turnCount = 0;
        const maxTurns = 25;
        while (turnCount < maxTurns) {
            turnCount++;
            // 1. Interactive provider thinking spinner
            const spinner = ui.makeThinkingSpinner(provider.name);
            spinner.start();
            let stepResult;
            try {
                stepResult = await provider.generateStep(systemInstruction);
            }
            catch (err) {
                spinner.stop();
                ui.printExecutionError(err.message);
                break;
            }
            spinner.stop();
            // 2. Print internal thought chain with provider styling
            if (stepResult.thinking) {
                ui.printThinking(stepResult.thinking, provider.name);
            }
            // 3. Final answer (no tool calls) - animate hype first, then print final answer
            if (stepResult.toolCalls.length === 0) {
                if (stepResult.text) {
                    await ui.animateHype(provider.name);
                    ui.printAgentText(stepResult.text, false, provider.name);
                }
                break;
            }
            // 4. Text emitted before tool calls
            if (stepResult.text) {
                ui.printAgentText(stepResult.text, true, provider.name);
            }
            const toolResults = [];
            for (const call of stepResult.toolCalls) {
                ui.printToolCall(call.name, call.args || {});
                if (call.name === "run_bash") {
                    const answer = await rl.question(ui.formatBashConfirmPrompt(call.args?.command ?? ""));
                    if (!/^y(es)?$/i.test(answer.trim())) {
                        ui.printBashDeclined();
                        toolResults.push({
                            id: call.id,
                            name: call.name,
                            output: "Command not executed: user declined confirmation.",
                        });
                        continue;
                    }
                }
                const toolSpinner = ui.makeSpinner(`Executing ${call.name}...`, "yellow").start();
                const output = await executeTool(call.name, call.args || {});
                toolSpinner.stop();
                ui.printToolOutput(output);
                toolResults.push({ id: call.id, name: call.name, output });
            }
            provider.addToolResults(toolResults);
        }
        if (turnCount >= maxTurns) {
            ui.printMaxTurnsReached();
        }
    }
}
startAgentApp();
