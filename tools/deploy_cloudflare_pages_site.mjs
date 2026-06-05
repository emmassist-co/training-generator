import { deployPagesSite, resolvePublisherContext } from "./cloudflare_pages_site.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = await resolvePublisherContext(options);
  const result = await deployPagesSite({
    projectName: context.projectName,
    captureName: options.captureName ?? "deploy-site",
  });

  console.log(JSON.stringify({
    projectName: context.projectName,
    ...result,
  }, null, 2));
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project") {
      options.project = argv[++i];
      continue;
    }
    if (arg === "--capture-name") {
      options.captureName = argv[++i];
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
