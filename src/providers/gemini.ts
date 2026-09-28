import { GoogleGenAI, type Content } from "@google/genai";
import { tools as geminiTools } from "../tools/schemas.js";
import { withRetry } from "./retry.js";
import type { LLMProvider, StepResult, ToolCall, UniversalMessage } from "./types.js";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;
  readonly model: string;
  private ai: GoogleGenAI;
  private history: Content[] = [];
  private universalHistory: UniversalMessage[] = [];

  constructor(apiKey: string, model: string = "gemini-2.5-flash") {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  addUserMessage(text: string): void {
    this.history.push({ role: "user", parts: [{ text }] });
    this.universalHistory.push({ role: "user", text });
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

    this.universalHistory.push({
      role: "assistant",
      text: text.trim() || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    });

    return {
      thinking: thinking.trim() || undefined,
      text: text.trim() || undefined,
      toolCalls,
    };
  }

  addToolResults(results: Array<{ id?: string; name: string; output: string }>): void {
    this.history.push({
      role: "user",
      parts: results.map((r) => ({
        functionResponse: {
          name: r.name,
          response: { result: r.output },
        },
      })),
    });

    this.universalHistory.push({
      role: "user",
      toolResults: results,
    });
  }

  resetContext(): void {
    this.history = [];
    this.universalHistory = [];
  }

  getHistory(): UniversalMessage[] {
    return this.universalHistory;
  }

  setHistory(history: UniversalMessage[]): void {
    this.resetContext();
    for (const item of history) {
      if (item.role === "user") {
        if (item.text) {
          this.addUserMessage(item.text);
        } else if (item.toolResults) {
          this.addToolResults(item.toolResults);
        }
      } else if (item.role === "assistant") {
        const parts: any[] = [];
        if (item.text) {
          parts.push({ text: item.text });
        }
        if (item.toolCalls) {
          for (const call of item.toolCalls) {
            parts.push({
              functionCall: {
                name: call.name,
                args: call.args,
              },
            });
          }
        }
        this.history.push({ role: "model", parts });
        this.universalHistory.push(item);
      }
    }
  }
}