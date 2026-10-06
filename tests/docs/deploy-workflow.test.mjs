import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("verified pushes to main deploy the production Worker", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  const pkg = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));

  assert.equal(workflow.match(/actions\/checkout@v7/g)?.length, 2);
  assert.equal(workflow.match(/actions\/setup-node@v7/g)?.length, 2);
  assert.doesNotMatch(workflow, /actions\/(?:checkout|setup-node)@v4/);
  assert.match(workflow, /deploy:\n\s+if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /needs: verify/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /vars\.CLOUDFLARE_ACCOUNT_ID/);
  assert.match(workflow, /run: npm run worker:deploy/);
  assert.equal(pkg.scripts["worker:deploy"], "vite build && wrangler deploy");
});
