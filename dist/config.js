import { fileURLToPath } from "url";
import path from "path";
import * as dotenv from "dotenv";
/**
 * Loads .env from the agent's own folder first, then falls back to the
 * current working directory (so it works whether run from source or dist).
 */
export function loadEnv() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    dotenv.config({ path: path.resolve(__dirname, "../.env") });
    dotenv.config(); // fallback to cwd .env
}
