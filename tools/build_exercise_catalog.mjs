#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeExercise } from "../src/db/exercise-catalog.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const input = args.input || path.join(repoRoot, "free-exercise-db", "dist", "exercises.json");
const output = args.output || path.join(repoRoot, "output", "exercise-catalog.seed.json");
const limit = args.limit ? Number(args.limit) : null;

const raw = JSON.parse(await readFile(input, "utf8"));
const rows = raw.slice(0, limit || raw.length).map(summarizeExercise);
await writeFile(output, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, input, output, count: rows.length }, null, 2));

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    parsed[item.slice(2)] = argv[index + 1];
    index += 1;
  }
  return parsed;
}
