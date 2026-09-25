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