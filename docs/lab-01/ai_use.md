# Lab 1 — AI Use and Reflection  (fill this in)

**LLM/agent used:** Antigravity (Gemini)

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result | Reflection |
|---|---------------------|----------------------------|------------|
| 1 | Check what's missing from acceptance criteria and give instructions to clear Issue 1. | Followed the instructions to complete missing setup steps and write the README. | This worked in one shot because pasting the full criteria gave exact context. |
| 2 | Write clean pull request to merge into lab1-staging branch. | Used the PR template for the GitHub pull request. | I had to follow up with a few more prompts to simplify the test instructions. It's kind of over-engineered |
| 3 | Check what's missing from Issue 2 acceptance criteria and give instructions to clear it without executing yet. | Followed the instructions to separate backend scope from Issue 4 and guide the `/api/health` implementation. | Worked in one shot. (Same reason as #1) |
| 4 | Check what's missing from Issue 3 acceptance criteria and provide instructions to clear it without executing yet. | Followed the instructions to generate the Prisma migration and implement idempotent upsert category seeding. | Worked in one shot. (Same reason as #1) |
| 5 | Check what's missing from Issue 4 acceptance criteria and provide instructions to clear it without executing yet. | Followed the instructions to implement the `GET /api/categories` endpoint, connect React UI with loading/error states, and write tests. | Worked in one shot. (Same reason as #1) |
| 6 | Draft pull request for Issue 4 with a reference example template provided. | Used the generated PR draft with summary, changes made, criteria checklist, and test steps for the GitHub PR submission. | The content is perfect, but I have to rework on the markdown that AI generated. The problems occur when there're multiple code snippets. |
| 7 | Draft concise PR to merge finished lab1-staging into main with strict styling constraints and no emojis. | Verify if the test instructions and structure in drafted PR are correct before merging the final Lab 1 vertical slice into main. | Good content. Have to rework on markdown AGAIN. |

## Reflection
Two or three sentences: what made your prompts better, and one place you had to
correct or reject what the agent produced.

Giving the agent a clear acceptance criteria and requesting step by step instructions before execution consistently gave precise, one shot results. Although, there're some limitations that the agent can't fix, such as the markdown formatting with code snippets and simplicity of test instructions in PR templates, which I had to manually adjust.