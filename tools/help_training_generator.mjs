#!/usr/bin/env node
const payload = {
  summary: "Training Generator is an agent-native workspace for planning sessions, rendering phone-friendly training pages, publishing them to Cloudflare Pages, and logging completions back into local state.",
  workflows: [
    {
      name: "Plan a session",
      skill: "create-training-plan",
      command: null,
      prompt: "Generate my next training session from my local state.",
    },
    {
      name: "Render HTML or PDF from existing session JSON",
      skill: "render-training-artifacts",
      command: "npm run render:html -- --input /absolute/path/to/session.json --output /absolute/path/to/session.html",
      prompt: "Render this session JSON into a phone page and a PDF.",
    },
    {
      name: "Publish a session page",
      skill: "publish-html-to-cloudflare",
      command: "npm run html:publish -- --html-file /absolute/path/to/session.html",
      prompt: "Publish this training HTML to Cloudflare and give me the URL and QR.",
    },
    {
      name: "Inspect or clean up artifacts and published pages",
      skill: "discover-training-workflows",
      command: "npm run artifacts:list",
      prompt: "List my rendered artifacts and published training pages, then delete the stale ones.",
    },
    {
      name: "Test the phone runtime",
      skill: "test-training-session-runtime",
      command: null,
      prompt: "Open the rendered training page and smoke-test the workout runtime.",
    },
    {
      name: "Log a finished workout",
      skill: "log-training-session",
      command: "npm run state:validate-log -- --input examples/completed-session-log.txt",
      prompt: "Here is a TL1 log. Update my local training history.",
    },
  ],
  emptyStateGuidance: [
    "No local training state yet: run `npm run init`, then edit `data/local/training-state.json` with the real profile and history.",
    "No Cloudflare config yet: run `npm run init`, then edit `config/training-generator.local.json` and authenticate Wrangler.",
    "No rendered plan yet: generate a session first, or render an existing session JSON with `npm run render:html`.",
  ],
  prompts: [
    "Generate my next training session from my local state.",
    "Render this session JSON into a phone page and publish it.",
    "Open the latest rendered plan and test the workout interactions.",
    "Here is a TL1 training log. Log it and tell me what it means for the next session.",
    "Show me the active profile, recent sessions, and Cloudflare publish context.",
    "List the published training pages in this workspace.",
    "Delete an old published page and remove its matching local artifacts.",
  ],
};

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(0);
}

process.stdout.write(`Training Generator Help

${payload.summary}

Main workflows:
${payload.workflows.map((workflow) => `- ${workflow.name}
  skill: ${workflow.skill}
  prompt: ${workflow.prompt}${workflow.command ? `\n  command: ${workflow.command}` : ""}`).join("\n")}

Try these prompts:
${payload.prompts.map((prompt) => `- ${prompt}`).join("\n")}

Empty-state guidance:
${payload.emptyStateGuidance.map((line) => `- ${line}`).join("\n")}
`);
