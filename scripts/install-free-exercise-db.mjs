import { access, mkdtemp, rm, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const repoUrl = "https://github.com/yuhonas/free-exercise-db.git";
const tarballUrl = "https://codeload.github.com/yuhonas/free-exercise-db/tar.gz/refs/heads/main";
const targetDir = path.join(workspaceRoot, "free-exercise-db");
const exercisesJsonPath = path.join(targetDir, "dist", "exercises.json");

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
}

async function installViaGit() {
  await rm(targetDir, { recursive: true, force: true });
  runCommand("git", ["clone", "--depth", "1", repoUrl, targetDir], workspaceRoot);
}

async function installViaTarball() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "training-generator-"));
  const archivePath = path.join(tempRoot, "free-exercise-db.tar.gz");
  const response = await fetch(tarballUrl);
  if (!response.ok) {
    throw new Error(`Failed to download free-exercise-db tarball: ${response.status} ${response.statusText}`);
  }
  const archiveBuffer = Buffer.from(await response.arrayBuffer());
  await writeFile(archivePath, archiveBuffer);
  runCommand("tar", ["-xzf", archivePath, "-C", tempRoot], workspaceRoot);
  await rm(targetDir, { recursive: true, force: true });
  await rename(path.join(tempRoot, "free-exercise-db-main"), targetDir);
  await rm(tempRoot, { recursive: true, force: true });
}

async function main() {
  if (await pathExists(exercisesJsonPath)) {
    console.log(JSON.stringify({ ok: true, installed: false, path: targetDir, source: "existing" }, null, 2));
    return;
  }

  try {
    await installViaGit();
    console.log(JSON.stringify({ ok: true, installed: true, path: targetDir, source: repoUrl }, null, 2));
    return;
  } catch (gitError) {
    console.warn(`git clone failed, falling back to tarball download: ${gitError instanceof Error ? gitError.message : String(gitError)}`);
  }

  await installViaTarball();
  console.log(JSON.stringify({ ok: true, installed: true, path: targetDir, source: tarballUrl }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
