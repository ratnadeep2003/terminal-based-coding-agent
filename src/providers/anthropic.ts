import Anthropic from "@anthropic-ai/sdk";
import { anthropicTools } from "../tools/schemas.js";
import { withRetry } from "./retry.js";
import type { LLMProvider, StepResult, ToolCall } from "./types.js";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  readonly model: string;
  private client: Anthropic;
  private messages: Anthropic.MessageParam[] = [];

  constructor(apiKey: string, model: string = "claude-3-7-sonnet-20250219") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  addUserMessage(text: string): void {
    this.messages.push({ role: "user", content: text });
  }

  async generateStep(systemInstruction: string): Promise<StepResult> {
    const response = await withRetry(() =>
      this.client.messages.create({
        model: this.model,
        system: systemInstruction,
        max_tokens: 4096,
        thinking: {
          type: "enabled",
          budget_tokens: 1024,
        },
        tools: anthropicTools,
        messages: this.messages,
      })
    );

    // Save assistant message to messages history
    this.messages.push({ role: "assistant", content: response.content });

    let thinking = "";
    let text = "";
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === "thinking") {
        thinking += (thinking ? "\n" : "") + block.thinking.trim();
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          args: (block.input as Record<string, any>) || {},
        });
      } else if (block.type === "text") {
        text += (text ? "\n" : "") + block.text.trim();
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
    this.messages.push({
      role: "user",
      content: results.map((r) => ({
        type: "tool_result" as const,
        tool_use_id: r.id || "",
        content: r.output,
      })),
    });
  }

  resetContext(): void {
    this.messages = [];
  }
}