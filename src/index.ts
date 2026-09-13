import { GoogleGenAI, type Content } from "@google/genai";
import * as dotenv from "dotenv";
import chalk from "chalk";
import { tools, executeTool } from "./tools.js";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function runAgent(prompt: string) {
  const history: Content[] = [{ role: "user", parts: [{ text: prompt }] }];

  console.log(chalk.blue.bold("\n🤖 Coding Agent Starting..."));

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: history,
      config: {
        systemInstruction:
          "You are an autonomous CLI coding agent. Inspect files, write code, run commands, and verify changes.",
        tools: [{ functionDeclarations: tools }],
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content) {
      console.log(chalk.red("No valid response from model."));
      break;
    }

    // Extract tool calls with strict type guard
    const functionCalls = (candidate.content.parts || [])
      .map((p) => p.functionCall)
      .filter((call): call is NonNullable<typeof call> => Boolean(call && call.name));

    // If no tool call, the agent has finished its task!
    if (functionCalls.length === 0) {
      console.log(chalk.green.bold("\nAgent:"), response.text ?? "(Done)");
      break;
    }

    // Record the model's intermediate action to conversation history
    history.push(candidate.content);

    // Execute each requested tool call
    for (const call of functionCalls) {
      const callName = call.name ?? "unknown_tool";
      const callArgs = (call.args as Record<string, any>) ?? {};

      console.log(chalk.yellow(`\n⚙ Tool Call: ${callName}(${JSON.stringify(callArgs)})`));

      const output = await executeTool(callName, callArgs);
      console.log(chalk.dim(`↳ Output: ${String(output).slice(0, 150)}...`));

      // Append tool execution result back into conversation history
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

// Test run
runAgent("Create a file called hello.ts that prints 'Hello from AI Agent' and execute it using npx tsx.");