import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pages = ["HomePage.tsx", "HistoryPage.tsx", "ChatPage.tsx"];

test("hosted product pages use Hono JSX with external browser runtimes", async () => {
  for (const page of pages) {
    const source = await readFile(new URL(`../../src/routes/${page}`, import.meta.url), "utf8");
    assert.match(source, /renderToString/);
    assert.match(source, /<FlueMasthead/);
    assert.match(source, /<script type="module" src="\/scripts\//);
    assert.doesNotMatch(source, /<script type="module">/);
  }
});
