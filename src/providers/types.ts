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

export interface UniversalMessage {
  role: "user" | "assistant";
  text?: string;
  toolCalls?: ToolCall[];
  toolResults?: Array<{ id?: string; name: string; output: string }>;
}

export interface LLMProvider {
  readonly name: "gemini" | "anthropic" | string;
  readonly model: string;

  addUserMessage(text: string): void;
  generateStep(systemInstruction: string): Promise<StepResult>;
  addToolResults(results: Array<{ id?: string; name: string; output: string }>): void;
  resetContext(): void;

  getHistory(): UniversalMessage[];
  setHistory(history: UniversalMessage[]): void;
}