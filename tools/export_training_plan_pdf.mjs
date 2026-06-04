#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const bundledNodeModules =
  path.join(
    os.homedir(),
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "node",
    "node_modules",
  );

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const playwrightPath = path.join(bundledNodeModules, "playwright", "index.mjs");
    return await import(pathToFileURL(playwrightPath).href);
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--input" && next) {
      args.input = next;
      i += 1;
    } else if (arg === "--output" && next) {
      args.output = next;
      i += 1;
    }
  }
  if (!args.input) {
    throw new Error("Missing required --input <html-path>");
  }
  return args;
}

function defaultOutputPath(inputPath) {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.pdf`);
}

async function waitForAssets(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const images = Array.from(document.images);
    await Promise.all(
      images.map(async (img) => {
        if (!img.currentSrc && !img.src) {
          return;
        }
        if (typeof img.decode === "function") {
          try {
            await img.decode();
            return;
          } catch {
            // Fall through to load/error listeners.
          }
        }
        if (img.complete) {
          return;
        }
        await new Promise((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      }),
    );
  });
}

async function main() {
  const { input, output } = parseArgs(process.argv);
  const inputPath = path.resolve(input);
  const outputPath = path.resolve(output || defaultOutputPath(inputPath));

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input HTML not found: ${inputPath}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 430, height: 932 },
      deviceScaleFactor: 2,
    });
    await page.goto(pathToFileURL(inputPath).href, { waitUntil: "networkidle" });
    await waitForAssets(page);
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "6mm",
        right: "6mm",
        bottom: "6mm",
        left: "6mm",
      },
    });

    process.stdout.write(
      JSON.stringify(
        {
          ok: true,
          input_path: inputPath,
          output_path: outputPath,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exit(1);
});
