import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const configDir = path.join(workspaceRoot, "config");
const localDataDir = path.join(workspaceRoot, "data", "local");
const examplePath = path.join(configDir, "training-generator.example.json");
const configOutputPath = path.join(configDir, "training-generator.local.json");
const exampleStatePath = path.join(workspaceRoot, "data", "training_state.json");
const localStateOutputPath = path.join(localDataDir, "training-state.json");

async function main() {
  await mkdir(configDir, { recursive: true });
  await mkdir(localDataDir, { recursive: true });

  const result = {
    ok: true,
    createdConfig: false,
    createdState: false,
    configPath: configOutputPath,
    statePath: localStateOutputPath,
    nextSteps: [
      "Edit config/training-generator.local.json",
      "Edit data/local/training-state.json with your real profile and history",
      "Run npm run install:exercise-db if the exercise database is missing",
      "Run npx wrangler login",
      "Create or reuse your Cloudflare Pages project",
      "Run npm test",
      "Run npm run html:publish:dry-run"
    ]
  };

  try {
    await readFile(configOutputPath, "utf8");
  } catch {
    const exampleConfig = await readFile(examplePath, "utf8");
    await writeFile(configOutputPath, exampleConfig, "utf8");
    result.createdConfig = true;
  }

  try {
    await readFile(localStateOutputPath, "utf8");
  } catch {
    const exampleState = await readFile(exampleStatePath, "utf8");
    await writeFile(localStateOutputPath, exampleState, "utf8");
    result.createdState = true;
  }

  if (!result.createdConfig && !result.createdState) {
    result.message = "Local config and training state already exist.";
  }

  console.log(
    JSON.stringify(result, null, 2)
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
