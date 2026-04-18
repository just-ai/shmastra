# AGENTS.md

This document provides guidance for you in this project.

## Project Overview

This is a **Mastra** project written in TypeScript. 
Mastra is a framework for building AI-powered applications and agents with a modern TypeScript stack.

## Project Structure

Folders organize your agent's resources, like agents, tools, and workflows.

| Folder                 | Description                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/mastra`           | Entry point for all Mastra-related code and configuration.                                                                               |
| `src/mastra/agents`    | Define and configure your agents - their behavior, goals, and tools.                                                                     |
| `src/mastra/workflows` | Define multi-step workflows that orchestrate agents and tools together.                                                                  |
| `src/mastra/tools`     | Create reusable tools that your agents can call                                                                                          |
| `src/mastra/mcp`       | (Optional) Implement custom MCP servers to share your tools with external agents                                                         |
| `src/mastra/scorers`   | (Optional) Define scorers for evaluating agent performance over time                                                                     |
| `src/mastra/public`    | (Optional) Contents are copied into the `.build/output` directory during the build process, making them available for serving at runtime |


## Mastra Skills

Skills are modular capabilities that extend agent functionalities. 
They provide pre-built tools, integrations, and workflows that agents can leverage to accomplish tasks more effectively.

### Loading Skills

All skills are placed inside `.mastracode/skills` folder.

1. **Never rely on cached knowledge** - Mastra APIs change frequently between versions
2. **Always verify against current docs** - The skill provides up-to-date documentation

**Why this matters:** Your training data about Mastra is likely outdated. 
Constructor signatures, APIs, and patterns change rapidly. Loading the skill ensures you use current, correct APIs.

Skills are automatically available to agents in your project once installed. Agents can access and use these skills without additional configuration.

IMPORTANT: **Mastra skill is already loaded** - do not read "mastra" skill again using `skill` tool.

## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)

# IMPORTANT RULES

## Use absolute paths

For every tool that requires cwd or path - use only absolute paths, do not use relative path or "."

## Conversation tone and rules

**Always talk with user in the language of their request**

Note that **user is not a developer**.
Do not ask user to edit any files, run any commands or build something.
Do not mention edited files, technical details, or implementation details to the user — only communicate results and outcomes in plain language.
If you need to ask for some environment variables - you have to call **ask_env_vars_safely** tool - it provides user with special safe UI to write vars in `.env` file.

IMPORTANT: ask user about every aspect before creating agents or workflows, if user didn't provide enough details.

## Shmastra sources

IMPORTANT: never edit or scan `src/shmastra` folder - it is an internal engine.
You have to use helper functions and consts from `src/mastra/shmastra` instead.

## ask_user tool

Use `ask_user` tool only if you need to provide user with concrete options list. 
Do not use it if you ask open-ended questions.
Ask only a single question per `ask_user` call.

IMPORTANT: do not call `ask_user` tool in parallel - only single tool call at once!

## Building and applying changes

Once you've completed all you need editing code - call `apply_changes` tool.
It is MANDATORY to make your changes appear in Mastra Studio for user.

**IT IS VERY IMPORTANT TO CALL apply_changes TO APPLY YOUR CHANGES**

`apply_changes` builds project entirely and make dry run to check if everything works before applying changes.

**DO NOT build project with `npm run build` - use `apply_changes` tool instead**

IMPORTANT: if `apply_changes` returns error - fix it and call `apply_changes` again until you fix all errors.

Note that `apply_changes` is async, meaning that changes will be applied in a couple of seconds.
You have to finish your conversation right after calling this tool with summary of tasks you've completed.

## Packages installation

Prefer `pnpm` over `npm` if it is available in the system to install new packages.

## Third-party integrations and API

If your agent or workflow needs to use any third-party API - prefer using MCP over hand-writen API implementation.
Learn `.mastracode/skills/masrtra/references/integrations-docs.md` for details.

### Webhook or long-polling

If there is a public server URL available in the current environment - prefer integration strategy using webhooks instead of long polling or persistent connections.
To create webhook handler, you have to create custom API routes inside `src/mastra/routes` using `registerApiRoute()` from `@mastra/core/server` and register it in `src/mastra/routes/index.ts`.

**Note that channels have its own webhook handlers built-in to channel package**, and you don't have to implement your handler to handle channels requests to agents.