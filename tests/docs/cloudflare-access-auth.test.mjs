import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Cloudflare Access is the sole hosted login gate", async () => {
  const app = await readFile(new URL("../../src/app.ts", import.meta.url), "utf8");
  const chatPage = await readFile(new URL("../../src/routes/ChatPage.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(app, /TRAINING_CHAT_PASSWORD/);
  assert.doesNotMatch(app, /WWW-Authenticate/);
  assert.doesNotMatch(app, /authorization/i);
  assert.doesNotMatch(chatPage, /password protected/i);
});

test("the hosted app uses the gym custom domain", async () => {
  const config = JSON.parse(
    await readFile(new URL("../../wrangler.jsonc", import.meta.url), "utf8"),
  );

  assert.deepEqual(config.routes, [
    {
      pattern: "gym.alexandrempsantos.com",
      custom_domain: true,
    },
  ]);
});
