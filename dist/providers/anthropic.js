import Anthropic from "@anthropic-ai/sdk";
import { anthropicTools } from "../tools/schemas.js";
import { withRetry } from "./retry.js";
export class AnthropicProvider {
    name = "anthropic";
    model;
    client;
    messages = [];
    constructor(apiKey, model = "claude-3-7-sonnet-20250219") {
        this.client = new Anthropic({ apiKey });
        this.model = model;
    }
    addUserMessage(text) {
        this.messages.push({ role: "user", content: text });
    }
    async generateStep(systemInstruction) {
        const response = await withRetry(() => this.client.messages.create({
            model: this.model,
            system: systemInstruction,
            max_tokens: 4096,
            thinking: {
                type: "enabled",
                budget_tokens: 1024,
            },
            tools: anthropicTools,
            messages: this.messages,
        }));
        // Save assistant message to messages history
        this.messages.push({ role: "assistant", content: response.content });
        let thinking = "";
        let text = "";
        const toolCalls = [];
        for (const block of response.content) {
            if (block.type === "thinking") {
                thinking += (thinking ? "\n" : "") + block.thinking.trim();
            }
            else if (block.type === "tool_use") {
                toolCalls.push({
                    id: block.id,
                    name: block.name,
                    args: block.input || {},
                });
            }
            else if (block.type === "text") {
                text += (text ? "\n" : "") + block.text.trim();
            }
        }
        return {
            thinking: thinking.trim() || undefined,
            text: text.trim() || undefined,
            toolCalls,
        };
    }
    addToolResults(results) {
        // Combine all tool results into a single user turn
        this.messages.push({
            role: "user",
            content: results.map((r) => ({
                type: "tool_result",
                tool_use_id: r.id || "",
                content: r.output,
            })),
        });
    }
    resetContext() {
        this.messages = [];
    }
}
