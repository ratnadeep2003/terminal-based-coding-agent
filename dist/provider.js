import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { tools as geminiTools, anthropicTools } from "./tools.js";
// ============================================================================
// Google Gemini Provider
// ============================================================================
export class GeminiProvider {
    name = "gemini";
    model;
    ai;
    history = [];
    constructor(apiKey, model = "gemini-3.6-flash") {
        this.ai = new GoogleGenAI({ apiKey });
        this.model = model;
    }
    addUserMessage(text) {
        this.history.push({ role: "user", parts: [{ text }] });
    }
    async generateStep(systemInstruction) {
        const response = await this.ai.models.generateContent({
            model: this.model,
            contents: this.history,
            config: {
                systemInstruction,
                thinkingConfig: { includeThoughts: true },
                tools: [{ functionDeclarations: geminiTools }],
            },
        });
        const candidate = response.candidates?.[0];
        if (!candidate || !candidate.content) {
            return { toolCalls: [], text: "No response received from Gemini." };
        }
        // Save assistant message to history
        this.history.push(candidate.content);
        let thinking = "";
        let text = "";
        const toolCalls = [];
        for (const part of candidate.content.parts || []) {
            if (part.thought && part.text) {
                thinking += (thinking ? "\n" : "") + part.text.trim();
            }
            else if (part.functionCall && part.functionCall.name) {
                toolCalls.push({
                    id: part.functionCall.id,
                    name: part.functionCall.name,
                    args: part.functionCall.args || {},
                });
            }
            else if (part.text) {
                text += (text ? "\n" : "") + part.text.trim();
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
    resetContext() {
        this.history = [];
    }
}
// ============================================================================
// Anthropic Claude Provider
// ============================================================================
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
        const response = await this.client.messages.create({
            model: this.model,
            system: systemInstruction,
            max_tokens: 4096,
            thinking: {
                type: "enabled",
                budget_tokens: 1024,
            },
            tools: anthropicTools,
            messages: this.messages,
        });
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
// ============================================================================
// Provider Factory
// ============================================================================
export function createProvider() {
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
    }
    else if (anthropicKey) {
        return new AnthropicProvider(anthropicKey);
    }
    else {
        throw new Error("No API key found. Please set GEMINI_API_KEY or ANTHROPIC_API_KEY in your .env file.");
    }
}
