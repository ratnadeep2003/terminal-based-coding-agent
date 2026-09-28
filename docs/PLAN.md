v1:
For v1 this is going to be a mini version of claude code, written in js and ts and by using anthropic or gemini api key
The user can directly use this agent in terminal and the agent can perform tasks such as reading writing and editing a file (for now in v1) and execute bash commands
The agent should also show what it is thinking in the terminal and show what tool calls it is using to complete the task
For now there is no need to give this coding agent access to a code file or folder will be given to it, it will make the changes and give the output

v1.1:
Ability to switch between ai models when tokens run out, token limit meter
v1.2:
Custom commands like claude code: /comapct, /btw, /branch, /init, /resume, /name, /export, /cost, /usgae, /status\
v1.3:
Add a theme colour ? not imp 
v1.4:
graph based data structure or extension so it dosent hallucinate: For v1.4 (Graph Structure): Don't just prevent hallucination; use Tree-sitter (via Node bindings) to build a semantic map of the codebase. This allows your agent to say "I know function X is used in file Y" without reading file Y.

v2:
Give this coding agent access to vscode and any other basic coding editor
Ability to give ths coding agent access to github to push clone pull and do all the basic git commands 

v3:
Make it improve itself: For v3 (Self-Improving): Tie this into the memory-first database. Every time the user rejects the agent's code or manually fixes a bug, the agent logs the diff in its database to update its own internal prompts and avoid making that specific mistake again.
------------------------------------------------------------------------------------------------

extra ideas: 

1. The "Architect + Coder" Dual-Model Pattern
Relying on a single massive model for everything is expensive and slow. Implement a multi-agent routing system. Use a highly capable, expensive model (like Claude 3.5 Sonnet) purely as the "Architect" to read the repo map and write a step-by-step plan. Then, hand that plan to a fast, cheap model (like Gemini Flash) to do the actual file editing.

2. Ephemeral Docker Sandboxing
Your current v1 executes bash commands directly. This is dangerous (rm -rf risk). Differentiate by automatically spinning up a lightweight Docker container that mirrors the user's environment. The agent executes tests and commands inside the sandbox. If the code breaks, the agent fixes it in the sandbox before ever touching the user's actual host files.

final step: release standalone executable via GitHub Releases