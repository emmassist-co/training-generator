import { deletePublishedPage, resolvePublisherContext, sanitizePathSegment } from "./cloudflare_pages_site.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.pathSegment) {
    throw new Error("Deleting a published page requires --path.");
  }

  const context = await resolvePublisherContext(options);
  const result = await deletePublishedPage({
    projectName: context.projectName,
    section: context.section,
    baseUrl: context.baseUrl,
    pathSegment: options.pathSegment,
    deploy: !options.dryRun,
  });

  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(argv) {
  const options = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--project") {
      options.project = argv[++i];
      continue;
    }
    if (arg === "--section") {
      options.section = argv[++i];
      continue;
    }
    if (arg === "--path") {
      options.pathSegment = sanitizePathSegment(argv[++i]);
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
