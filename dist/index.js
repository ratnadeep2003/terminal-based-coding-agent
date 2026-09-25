#!/usr/bin/env node
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { loadEnv } from "./config.js";
import { createProvider } from "./providers/index.js";
import { executeTool } from "./tools/index.js";
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
    ui.printBanner(provider.name, provider.model, process.cwd());
    const systemInstruction = `You are an autonomous CLI coding assistant operating directly in ${process.cwd()}.
You have access to tools to read files, write files (with automatic directory creation), edit files (exact text replacement), and run bash commands.
Always think step-by-step before taking action. Verify changes by inspecting files or running commands.`;
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
        provider.addUserMessage(userPrompt);
        const spinner = ui.makeSpinner("Thinking...");
        // Inner ReAct execution loop
        let turnCount = 0;
        const maxTurns = 25;
        while (turnCount < maxTurns) {
            turnCount++;
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
            if (stepResult.thinking) {
                ui.printThinking(stepResult.thinking);
            }
            // No tool calls means the model has finished the task
            if (stepResult.toolCalls.length === 0) {
                if (stepResult.text)
                    ui.printAgentText(stepResult.text);
                break;
            }
            if (stepResult.text)
                ui.printAgentText(stepResult.text, true);
            const toolResults = [];
            for (const call of stepResult.toolCalls) {
                ui.printToolCall(call.name, call.args || {});
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
