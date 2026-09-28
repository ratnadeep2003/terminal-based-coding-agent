import chalk from "chalk";
import ora, { type Ora } from "ora";

export type Expression = "happy" | "excited" | "thinking" | "winking" | "surprised" | "neutral";
export type Provider = "gemini" | "anthropic" | string;

/* -------------------------------------------------------
   TERMINAL AVATARS & EXPRESSIONS
------------------------------------------------------- */

export function getAgentAvatar(provider: Provider, expression: Expression = "neutral"): string {
  const isClaude = provider.toLowerCase().includes("anthropic") || provider.toLowerCase().includes("claude");

  if (isClaude) {
    // Claude Signature Orange Character
    const orange = chalk.hex("#D97757").bold;
    const eyes = {
      neutral: "● _ ●",
      happy: "◠ _ ◠",
      excited: "★ _ ★",
      thinking: "⊙ _ ⊙ ?",
      winking: "◰ _ ◠",
      surprised: "O _ O",
    }[expression];

    return orange(` ┌─────┐\n └─[${eyes}]─┘\n  │ │ │ │`);
  } else {
    // Gemini Sparkle Character
    const geminiGrad = chalk.bold.cyan;
    const eyes = {
      neutral: "• ‿ •",
      happy: "^ ‿ ^",
      excited: "★ ‿ ★",
      thinking: "° ‿ ° ?",
      winking: "x ‿ •",
      surprised: "o ‿ o",
    }[expression];

    return geminiGrad(`   ✦\n ✦ [${eyes}] ✦\n   ✦`);
  }
}

/* -------------------------------------------------------
   UI FUNCTIONS
------------------------------------------------------- */

export function printBanner(providerName: string, model: string, cwd: string): void {
  console.clear();
  const avatar = getAgentAvatar(providerName, "happy");
  const isClaude = providerName.toLowerCase().includes("anthropic") || providerName.toLowerCase().includes("claude");
  const borderColor = isClaude ? chalk.hex("#D97757") : chalk.cyan;

  console.log(borderColor("============================================="));
  console.log(avatar);
  console.log(chalk.bold("         🤖 Terminal Coding Agent            "));
  console.log(chalk.dim(` Provider:         ${providerName.toUpperCase()} (${model})`));
  console.log(chalk.dim(` Working directory: ${cwd}`));
  console.log(chalk.dim(" Type 'exit' to quit, '/clear' to reset, '/open <dir>' to switch project."));
  console.log(borderColor("=============================================\n"));
}

export function printInitError(message: string): void {
  console.error(chalk.red.bold("\n❌ Initialization Error:"), message);
  console.log(chalk.yellow("Please ensure GEMINI_API_KEY or ANTHROPIC_API_KEY is configured in your .env file.\n"));
}

export function printThinking(thinking: string, provider: Provider = "anthropic"): void {
  const isClaude = provider.toLowerCase().includes("anthropic");
  const color = isClaude ? chalk.hex("#D97757") : chalk.magenta;

  console.log(color("\n💭 Thinking:"));
  console.log(chalk.dim(thinking));
}

/**
 * Creates an interactive spinning loader with character facial expressions and question mark.
 */
export function makeThinkingSpinner(provider: Provider = "anthropic"): Ora {
  const isClaude = provider.toLowerCase().includes("anthropic");
  const colorHex = isClaude ? "#D97757" : "#8B5CF6";

  const frames = isClaude
    ? [
        chalk.hex(colorHex)(" └─[⊙ _ ⊙ ?]─┘  Thinking..."),
        chalk.hex(colorHex)(" └─[o _ ⊙ ?]─┘  Thinking..."),
        chalk.hex(colorHex)(" └─[⊙ _ o ?]─┘  Thinking..."),
        chalk.hex(colorHex)(" └─[⊙ _ ⊙ ?]─┘  Analyzing code..."),
      ]
    : [
        chalk.hex(colorHex)(" ✦ [° ‿ ° ?] ✦  Thinking..."),
        chalk.hex(colorHex)(" ✧ [° ‿ ° ?] ✧  Thinking..."),
        chalk.hex(colorHex)(" ✦ [° ‿ ° ?] ✦  Analyzing context..."),
      ];

  return ora({
    spinner: {
      interval: 180,
      frames,
    },
  });
}

/**
 * Jumps/hypes when results are ready!
 */
export async function animateHype(provider: Provider = "anthropic"): Promise<void> {
  const isClaude = provider.toLowerCase().includes("anthropic");
  const color = isClaude ? chalk.hex("#D97757").bold : chalk.cyan.bold;

  const jump1 = isClaude ? " └─[★ _ ★]─┘  Ready!" : " ✦ [★ ‿ ★] ✦  Ready!";
  const jump2 = isClaude ? "  └─[★ _ ★]─┘ ✨ Done!" : "  ✦ [★ ‿ ★] ✦ ✨ Done!";

  process.stdout.write("\r" + color(jump1));
  await new Promise((r) => setTimeout(r, 150));
  process.stdout.write("\r" + color(jump2) + "\n");
}

export function printAgentText(text: string, inline = false, provider: Provider = "anthropic"): void {
  const isClaude = provider.toLowerCase().includes("anthropic");
  const tagColor = isClaude ? chalk.hex("#D97757").bold : chalk.cyan.bold;

  console.log(tagColor(inline ? "\nAgent: " : "\nAgent:\n") + text);
}

export function printToolCall(name: string, args: Record<string, any>): void {
  console.log(chalk.yellow(`\n⚙ Tool Call: ${name}(${JSON.stringify(args)})`));
}

export function printToolOutput(output: string): void {
  const preview = output.length > 300 ? output.slice(0, 300) + "... [truncated]" : output;
  console.log(chalk.dim(`↳ Output: ${preview}`));
}

export function printExecutionError(message: string): void {
  console.log(chalk.red.bold(`\n❌ Error during execution: ${message}`));
}

export function printMaxTurnsReached(): void {
  console.log(chalk.yellow("\n⚠️ Reached maximum turn limit for this prompt."));
}

export function printContextCleared(): void {
  console.clear();
  console.log(chalk.yellow("🧹 Context reset. Conversation history cleared."));
}

export function printGoodbye(): void {
  console.log(chalk.yellow("Goodbye!"));
}

export function makeSpinner(text: string, color: Ora["color"] = "cyan"): Ora {
  return ora({ text: chalk.dim(text), color });
}

export function formatBashConfirmPrompt(command: string): string {
  return (
    chalk.red.bold("\n⚠ Run this command? ") +
    chalk.white(command) +
    chalk.dim(" [y/N] ")
  );
}

export function printBashDeclined(): void {
  console.log(chalk.yellow("↳ Skipped: command not approved."));
}

export function printWorkspaceOpened(dir: string): void {
  console.log(chalk.green(`📂 Workspace set to ${dir}`));
}

export function printError(message: string): void {
  console.log(chalk.red(`❌ ${message}`));
}