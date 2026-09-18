import { GoogleGenAI, type Content } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { tools as geminiTools, anthropicTools } from "./tools.js";

export interface ToolCall {
  id?: string;
  name: string;
  args: Record<string, any>;
}

export interface StepResult {
  thinking?: string;
  text?: string;
  toolCalls: ToolCall[];
}

export interface LLMProvider {
  readonly name: "gemini" | "anthropic";
  readonly model: string;

  addUserMessage(text: string): void;
  generateStep(systemInstruction: string): Promise<StepResult>;
  addToolResults(results: Array<{ id?: string; name: string; output: string }>): void;
  resetContext(): void;
}

// ============================================================================
// Google Gemini Provider
// ============================================================================
async function withRetry<T>(fn: () => Promise<T>, retries = 5): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      const retryable =
        [429, 500, 503, 529].includes(err?.status) ||
        /"code":\s*(429|500|503)|UNAVAILABLE|overloaded/i.test(msg);
      if (!retryable || attempt >= retries) throw err;
      const delay = Math.min(30000, 1000 * 2 ** attempt) + Math.random() * 500;
      console.log(`\n⏳ Model busy, retrying in ${(delay / 1000).toFixed(1)}s (${attempt + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
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

// ============================================================================
// Anthropic Claude Provider
// ============================================================================
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

// ============================================================================
// Provider Factory
// ============================================================================
export function createProvider(): LLMProvider {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const preferred = (process.env.DEFAULT_PROVIDER || "").toLowerCase().trim();

  if (preferred === "anthropic") {
    if (!anthropicKey) {
      throw new Error("DEFAULT_PROVIDER is set to 'anthropic', but ANTHROPIC_API_KEY is not set in .env.");
    }
    return new AnthropicProvider(anthropicKey);
  }

  if (preferred === "gemini") {
    if (!geminiKey) {
      throw new Error("DEFAULT_PROVIDER is set to 'gemini', but GEMINI_API_KEY is not set in .env.");
    }
    return new GeminiProvider(geminiKey);
  }

  // Auto-detect based on available keys
  if (geminiKey) {
    return new GeminiProvider(geminiKey);
  } else if (anthropicKey) {
    return new AnthropicProvider(anthropicKey);
  } else {
    throw new Error(
      "No API key found. Please set GEMINI_API_KEY or ANTHROPIC_API_KEY in your .env file."
    );
  }
}
