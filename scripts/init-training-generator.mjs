import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const configDir = path.join(workspaceRoot, "config");
const examplePath = path.join(configDir, "training-generator.example.json");
const outputPath = path.join(configDir, "training-generator.local.json");

async function main() {
  await mkdir(configDir, { recursive: true });

  try {
    await readFile(outputPath, "utf8");
    console.log(
      JSON.stringify(
        {
          ok: true,
          created: false,
          configPath: outputPath,
          message: "Local config already exists.",
          nextSteps: [
            "Review config/training-generator.local.json",
            "Run npx wrangler login",
            "Create or reuse your Cloudflare Pages project",
            "Run npm test",
            "Run npm run html:publish:dry-run"
          ]
        },
        null,
        2
      )
    );
    return;
  } catch {}

  const exampleConfig = await readFile(examplePath, "utf8");
  await writeFile(outputPath, exampleConfig, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        created: true,
        configPath: outputPath,
        nextSteps: [
          "Edit config/training-generator.local.json",
          "Run npx wrangler login",
          "Create or reuse your Cloudflare Pages project",
          "Run npm test",
          "Run npm run html:publish:dry-run"
        ]
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
