import { GeminiProvider } from "./gemini.js";
import { AnthropicProvider } from "./anthropic.js";
export { GeminiProvider } from "./gemini.js";
export { AnthropicProvider } from "./anthropic.js";
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
