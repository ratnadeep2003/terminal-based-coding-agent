export async function withRetry(fn, retries = 5) {
    for (let attempt = 0;; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            const msg = String(err?.message ?? "");
            const retryable = [429, 500, 503, 529].includes(err?.status) ||
                /"code":\s*(429|500|503)|UNAVAILABLE|overloaded/i.test(msg);
            if (!retryable || attempt >= retries)
                throw err;
            const delay = Math.min(30000, 1000 * 2 ** attempt) + Math.random() * 500;
            console.log(`\n⏳ Model busy, retrying in ${(delay / 1000).toFixed(1)}s (${attempt + 1}/${retries})...`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
}
