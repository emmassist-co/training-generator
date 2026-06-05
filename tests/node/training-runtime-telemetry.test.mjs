import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);

test("rendered runtime exports bounded telemetry for swap, sets, completion, and timer usage", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "training-runtime-telemetry-"));
  const sessionPath = path.join(tempRoot, "session.json");
  const htmlPath = path.join(tempRoot, "session.html");

  await writeFile(
    sessionPath,
    JSON.stringify(
      {
        title: "Telemetry Smoke Session",
        subtitle: "Runtime telemetry smoke test",
        exercises: [
          {
            exercise_id: "Goblet_Squat",
            name: "Goblet Squat",
            sets: 3,
            reps: 8,
            rest_seconds: 60,
            load: "moderate",
            reason: "Primary set-based movement.",
            execution_notes: ["Stay upright."],
            alternatives: [
              {
                exercise_id: "Leg_Press",
                name: "Leg Press",
                sets: 3,
                reps: 8,
                rest_seconds: 60,
                load: "moderate",
                note: "Use if the squat area is busy."
              }
            ]
          },
          {
            name: "Bike Flush",
            duration: "30s",
            reason: "Simple timer-driven finisher.",
            execution_notes: ["Keep a steady pace."]
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  const renderResult = await run("python3", ["./tools/render_training_plan.py", "--input", sessionPath, "--output", htmlPath], repoRoot);
  assert.equal(renderResult.exitCode, 0, renderResult.stderr);
  await readFile(htmlPath, "utf8");

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href);

  await page.getByRole("button", { name: /start session/i }).click();
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: /use this instead/i }).click();
  await page.waitForTimeout(150);
  await page.locator('[data-action="complete-set"][data-index="0"]').click();
  await page.waitForTimeout(150);
  await page.locator('[data-action="complete-set"][data-index="0"]').click();
  await page.waitForTimeout(150);
  await page.locator('[data-action="complete-set"][data-index="0"]').click();
  await page.waitForTimeout(150);
  await page.locator('[data-action="toggle-timer"][data-index="1"]').click();
  await page.waitForTimeout(150);
  await page.locator('[data-action="toggle-timer"][data-index="1"]').click();
  await page.waitForTimeout(150);
  await page.locator('[data-action="reset-timer"][data-index="1"]').click();
  await page.waitForTimeout(150);
  await page.locator('[data-action="mark-done"][data-index="1"]').click();

  const summary = await page.evaluate(() => window.__TRAINING_DEBUG__.buildSummary());
  await browser.close();

  assert.match(summary, /^TL1 /);
  const payload = JSON.parse(summary.slice(4));
  assert.equal(payload.tm.v, 1);
  assert.equal(payload.tm.tk, 100);
  assert.equal(payload.ex.length, 2);
  assert.equal(payload.ex[0].tm.st.length, 3);
  assert.equal(payload.ex[0].tm.swt.length, 1);
  assert.ok(payload.ex[0].tm.aw.length >= 1);
  assert.ok(payload.ex[0].tm.ce.some((event) => event[1] === 1));
  assert.deepEqual(
    payload.ex[1].tm.ti.map((event) => event[0]),
    ["start", "pause", "reset"]
  );
});

function run(command, args, cwd, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}
