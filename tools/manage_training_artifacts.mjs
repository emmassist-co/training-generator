import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const artifactsRoot = path.join(workspaceRoot, "output", "training-plans");

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (options.deleteStem) {
    const deleted = await deleteArtifactSet(options.deleteStem);
    console.log(JSON.stringify({ ok: true, action: "deleted", ...deleted }, null, 2));
    return;
  }

  const artifacts = await listArtifacts();
  console.log(JSON.stringify({ artifactsRoot, artifacts }, null, 2));
}

function parseArgs(argv) {
  const options = {
    help: false,
    deleteStem: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--delete") {
      options.deleteStem = argv[++i];
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function listArtifacts() {
  const entries = await readdir(artifactsRoot, { withFileTypes: true }).catch(() => []);
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const stems = [...new Set(files.map((name) => path.basename(name, path.extname(name))))].sort().reverse();

  return stems.map((stem) => ({
    stem,
    htmlPath: files.includes(`${stem}.html`) ? path.join(artifactsRoot, `${stem}.html`) : null,
    pdfPath: files.includes(`${stem}.pdf`) ? path.join(artifactsRoot, `${stem}.pdf`) : null,
  }));
}

async function deleteArtifactSet(stem) {
  const safeStem = path.basename(stem);
  const htmlPath = path.join(artifactsRoot, `${safeStem}.html`);
  const pdfPath = path.join(artifactsRoot, `${safeStem}.pdf`);
  await rm(htmlPath, { force: true });
  await rm(pdfPath, { force: true });
  return {
    stem: safeStem,
    htmlPath,
    pdfPath,
  };
}

function printHelp() {
  console.log(`Usage:
  npm run artifacts:list
  npm run artifacts:delete -- --delete lower-body-strength-a

Options:
  --delete <stem>  Delete the matching HTML/PDF pair from output/training-plans.
  --help           Show this help.
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
