import chalk from "chalk";
import ora from "ora";
export function printBanner(providerName, model, cwd) {
    console.clear();
    console.log(chalk.bold.cyan("============================================="));
    console.log(chalk.bold.cyan("         🤖 Terminal Coding Agent            "));
    console.log(chalk.dim(` Provider:         ${providerName.toUpperCase()} (${model})`));
    console.log(chalk.dim(` Working directory: ${cwd}`));
    console.log(chalk.dim(" Type 'exit' to quit, or '/clear' to reset."));
    console.log(chalk.bold.cyan("=============================================\n"));
}
export function printInitError(message) {
    console.error(chalk.red.bold("\n❌ Initialization Error:"), message);
    console.log(chalk.yellow("Please ensure GEMINI_API_KEY or ANTHROPIC_API_KEY is configured in your .env file.\n"));
}
export function printThinking(thinking) {
    console.log(chalk.bold.magenta("\n💭 Thinking:"));
    console.log(chalk.dim(thinking));
}
export function printAgentText(text, inline = false) {
    console.log(chalk.bold.blue(inline ? "\nAgent: " : "\nAgent:\n") + text);
}
export function printToolCall(name, args) {
    console.log(chalk.yellow(`\n⚙ Tool Call: ${name}(${JSON.stringify(args)})`));
}
export function printToolOutput(output) {
    const preview = output.length > 300 ? output.slice(0, 300) + "... [truncated]" : output;
    console.log(chalk.dim(`↳ Output: ${preview}`));
}
export function printExecutionError(message) {
    console.log(chalk.red.bold(`\n❌ Error during execution: ${message}`));
}
export function printMaxTurnsReached() {
    console.log(chalk.yellow("\n⚠️ Reached maximum turn limit for this prompt."));
}
export function printContextCleared() {
    console.clear();
    console.log(chalk.yellow("🧹 Context reset. Conversation history cleared."));
}
export function printGoodbye() {
    console.log(chalk.yellow("Goodbye!"));
}
export function makeSpinner(text, color = "cyan") {
    return ora({ text: chalk.dim(text), color });
}
export function formatBashConfirmPrompt(command) {
    return (chalk.red.bold("\n⚠ Run this command? ") +
        chalk.white(command) +
        chalk.dim(" [y/N] "));
}
export function printBashDeclined() {
    console.log(chalk.yellow("↳ Skipped: command not approved."));
}
