import { GoogleGenAI } from "@google/genai";
import { tools as geminiTools } from "../tools/schemas.js";
import { withRetry } from "./retry.js";
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
        const response = await withRetry(() => this.ai.models.generateContent({
            model: this.model,
            contents: this.history,
            config: {
                systemInstruction,
                thinkingConfig: { includeThoughts: true },
                tools: [{ functionDeclarations: geminiTools }],
            },
        }));
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
