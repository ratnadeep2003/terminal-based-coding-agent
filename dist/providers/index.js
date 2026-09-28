import { GeminiProvider } from "./gemini.js";
import { AnthropicProvider } from "./anthropic.js";
import chalk from "chalk";
export { GeminiProvider } from "./gemini.js";
export { AnthropicProvider } from "./anthropic.js";
export class FallbackProvider {
    primary;
    fallback;
    active;
    constructor(primary, fallback) {
        this.primary = primary;
        this.fallback = fallback;
        this.active = primary;
    }
    get name() {
        return this.active.name;
    }
    get model() {
        return this.active.model;
    }
    addUserMessage(text) {
        this.active.addUserMessage(text);
    }
    addToolResults(results) {
        this.active.addToolResults(results);
    }
    resetContext() {
        this.primary.resetContext();
        if (this.fallback)
            this.fallback.resetContext();
        this.active = this.primary;
    }
    getHistory() {
        return this.active.getHistory();
    }
    setHistory(history) {
        this.active.setHistory(history);
    }
    async generateStep(systemInstruction) {
        try {
            return await this.active.generateStep(systemInstruction);
        }
        catch (err) {
            const isQuotaOrTokenError = err.status === 429 ||
                err.statusCode === 429 ||
                err.message?.includes("429") ||
                err.message?.includes("RESOURCE_EXHAUSTED") ||
                err.message?.includes("rate_limit") ||
                err.message?.includes("overloaded_error") ||
                err.message?.includes("token");
            if (isQuotaOrTokenError && this.fallback && this.active === this.primary) {
                console.log(chalk.yellow.bold(`\n⚠️ Provider '${this.primary.name}' ran out of quota/tokens (${err.message || "Rate limit"}). Switching to '${this.fallback.name}'...\n`));
                const currentHistory = this.primary.getHistory();
                this.active = this.fallback;
                this.active.setHistory(currentHistory);
                // Retry generating step with fallback provider
                return await this.active.generateStep(systemInstruction);
            }
            throw err;
        }
    }
}
export function createProvider() {
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
    const preferred = (process.env.DEFAULT_PROVIDER || "").toLowerCase().trim();
    let primary;
    let fallback;
    if (preferred === "anthropic") {
        if (!anthropicKey) {
            throw new Error("DEFAULT_PROVIDER is set to 'anthropic', but ANTHROPIC_API_KEY is not set in .env.");
        }
        primary = new AnthropicProvider(anthropicKey);
        if (geminiKey)
            fallback = new GeminiProvider(geminiKey);
    }
    else if (preferred === "gemini") {
        if (!geminiKey) {
            throw new Error("DEFAULT_PROVIDER is set to 'gemini', but GEMINI_API_KEY is not set in .env.");
        }
        primary = new GeminiProvider(geminiKey);
        if (anthropicKey)
            fallback = new AnthropicProvider(anthropicKey);
    }
    else {
        // Auto-detect based on available keys
        if (anthropicKey && geminiKey) {
            primary = new AnthropicProvider(anthropicKey);
            fallback = new GeminiProvider(geminiKey);
        }
        else if (anthropicKey) {
            primary = new AnthropicProvider(anthropicKey);
        }
        else if (geminiKey) {
            primary = new GeminiProvider(geminiKey);
        }
        else {
            throw new Error("No API key found. Please set GEMINI_API_KEY or ANTHROPIC_API_KEY in your .env file.");
        }
    }
    return new FallbackProvider(primary, fallback);
}
