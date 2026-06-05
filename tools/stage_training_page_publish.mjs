import {
  deriveTitleFromHtmlFile,
  extractHtmlTitle,
  loadHtmlInput,
  resolveProductionBaseUrl,
  resolvePublisherContext,
  sanitizePathSegment,
  stagePublishedPage,
} from "./cloudflare_pages_site.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = await resolvePublisherContext(options);
  const rawHtml = await loadHtmlInput(options);
  const resolvedTitle =
    options.title ??
    extractHtmlTitle(rawHtml) ??
    deriveTitleFromHtmlFile(options.htmlFile) ??
    "training-session";
  const baseUrl = options.dryRun
    ? context.baseUrl
    : await resolveProductionBaseUrl(context.projectName);

  const result = await stagePublishedPage({
    projectName: context.projectName,
    section: context.section,
    baseUrl,
    title: resolvedTitle,
    html: rawHtml,
    slug: options.slug,
    pathSegment: options.pathSegment,
    configPath: context.workspaceConfig.__configPath ?? null,
  });

  console.log(JSON.stringify({
    ...result,
    mode: options.dryRun ? "dry-run" : "staged",
  }, null, 2));
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
    if (arg === "--path") {
      options.pathSegment = sanitizePathSegment(argv[++i]);
      continue;
    }
    if (arg === "--slug") {
      options.slug = argv[++i];
      continue;
    }
    if (arg === "--section") {
      options.section = argv[++i];
      continue;
    }
    if (arg === "--html-file") {
      options.htmlFile = argv[++i];
      continue;
    }
    if (arg === "--html") {
      options.html = argv[++i];
      continue;
    }
    if (arg === "--title") {
      options.title = argv[++i];
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
