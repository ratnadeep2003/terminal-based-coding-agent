import Anthropic from "@anthropic-ai/sdk";
import { anthropicTools } from "../tools/schemas.js";
import { withRetry } from "./retry.js";
export class AnthropicProvider {
    name = "anthropic";
    model;
    client;
    messages = [];
    universalHistory = [];
    constructor(apiKey, model = "claude-3-7-sonnet-20250219") {
        this.client = new Anthropic({ apiKey });
        this.model = model;
    }
    addUserMessage(text) {
        this.messages.push({ role: "user", content: text });
        this.universalHistory.push({ role: "user", text });
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
    addToolResults(results) {
        this.messages.push({
            role: "user",
            content: results.map((r) => ({
                type: "tool_result",
                tool_use_id: r.id || "",
                content: r.output,
            })),
        });
        this.universalHistory.push({
            role: "user",
            toolResults: results,
        });
    }
    resetContext() {
        this.messages = [];
        this.universalHistory = [];
    }
    getHistory() {
        return this.universalHistory;
    }
    setHistory(history) {
        this.resetContext();
        for (const item of history) {
            if (item.role === "user") {
                if (item.text) {
                    this.addUserMessage(item.text);
                }
                else if (item.toolResults) {
                    this.addToolResults(item.toolResults);
                }
            }
            else if (item.role === "assistant") {
                const content = [];
                if (item.text) {
                    content.push({ type: "text", text: item.text });
                }
                if (item.toolCalls) {
                    for (const call of item.toolCalls) {
                        content.push({
                            type: "tool_use",
                            id: call.id || `tool_${Math.random().toString(36).substring(2, 9)}`,
                            name: call.name,
                            input: call.args,
                        });
                    }
                }
                this.messages.push({ role: "assistant", content });
                this.universalHistory.push(item);
            }
        }
    }
}
