import { GoogleGenAI, type Content } from "@google/genai";
import { tools as geminiTools } from "../tools/schemas.js";
import { withRetry } from "./retry.js";
import type { LLMProvider, StepResult, ToolCall } from "./types.js";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;
  readonly model: string;
  private ai: GoogleGenAI;
  private history: Content[] = [];

  constructor(apiKey: string, model: string = "gemini-3.6-flash") {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  addUserMessage(text: string): void {
    this.history.push({ role: "user", parts: [{ text }] });
  }

  async generateStep(systemInstruction: string): Promise<StepResult> {
    const response = await withRetry(() =>
      this.ai.models.generateContent({
        model: this.model,
        contents: this.history,
        config: {
          systemInstruction,
          thinkingConfig: { includeThoughts: true },
          tools: [{ functionDeclarations: geminiTools }],
        },
      })
    );

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content) {
      return { toolCalls: [], text: "No response received from Gemini." };
    }

    // Save assistant message to history
    this.history.push(candidate.content);

    let thinking = "";
    let text = "";
    const toolCalls: ToolCall[] = [];

    for (const part of candidate.content.parts || []) {
      if (part.thought && part.text) {
        thinking += (thinking ? "\n" : "") + part.text.trim();
      } else if (part.functionCall && part.functionCall.name) {
        toolCalls.push({
          id: (part.functionCall as any).id,
          name: part.functionCall.name,
          args: (part.functionCall.args as Record<string, any>) || {},
        });
      } else if (part.text) {
        text += (text ? "\n" : "") + part.text.trim();
      }
    }

    return {
      thinking: thinking.trim() || undefined,
      text: text.trim() || undefined,
      toolCalls,
    };
  }

  addToolResults(results: Array<{ id?: string; name: string; output: string }>): void {
    // Combine all tool results into a single user turn
    this.history.push({
      role: "user",
      parts: results.map((r) => ({
        functionResponse: {
          name: r.name,
          response: { result: r.output },
        },
      })),
    });
  }

  resetContext(): void {
    this.history = [];
  }
}