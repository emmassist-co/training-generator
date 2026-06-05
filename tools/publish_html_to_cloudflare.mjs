import path from "node:path";
import { writeFile } from "node:fs/promises";
import {
  defaultProjectName,
  defaultSection,
  defaultConfigPath,
  deriveTitleFromHtmlFile,
  extractHtmlTitle,
  loadHtmlInput,
  listPublishedPages,
  loadWorkspaceConfig,
  resolveProductionBaseUrl,
  resolvePublisherContext,
  sanitizePathSegment,
  stagePublishedPage,
  deployPagesSite,
  deletePublishedPage,
} from "./cloudflare_pages_site.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const context = await resolvePublisherContext(options);

  if (options.listPublished) {
    const pages = await listPublishedPages({
      baseUrl: context.baseUrl,
      section: options.section ? context.section : null,
    });
    console.log(JSON.stringify({
      projectName: context.projectName,
      section: options.section ? context.section : null,
      baseUrl: context.baseUrl,
      pages,
    }, null, 2));
    return;
  }

  if (options.deletePublished) {
    if (!options.pathSegment) {
      throw new Error("Deleting a published page requires --path.");
    }
    const result = await deletePublishedPage({
      projectName: context.projectName,
      section: context.section,
      baseUrl: context.baseUrl,
      pathSegment: options.pathSegment,
      deploy: !options.dryRun,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const rawHtml = await loadHtmlInput(options);
  const resolvedTitle =
    options.title ??
    extractHtmlTitle(rawHtml) ??
    deriveTitleFromHtmlFile(options.htmlFile) ??
    "training-session";
  const publishBaseUrl = options.dryRun
    ? context.baseUrl
    : await resolveProductionBaseUrl(context.projectName);

  const staged = await stagePublishedPage({
    projectName: context.projectName,
    section: context.section,
    baseUrl: publishBaseUrl,
    title: resolvedTitle,
    html: rawHtml,
    slug: options.slug,
    pathSegment: options.pathSegment,
    configPath: context.workspaceConfig.__configPath ?? null,
  });

  if (options.dryRun) {
    console.log(JSON.stringify({ ...staged, mode: "dry-run" }, null, 2));
    return;
  }

  const deployment = await deployPagesSite({
    projectName: context.projectName,
    captureName: staged.pageId,
  });

  const result = {
    deployedAt: new Date().toISOString(),
    projectName: context.projectName,
    section: context.section,
    pageId: staged.pageId,
    pageUrl: staged.pageUrl,
    qrCodePath: staged.qrCodePath,
    baseUrl: publishBaseUrl,
    configPath: context.workspaceConfig.__configPath ?? null,
    deploymentUrl: deployment.deploymentUrl,
    siteRoot: staged.siteRoot,
    outputCapturePath: deployment.outputCapturePath,
  };

  await writeFile(
    path.join(staged.pageDir, "deployment.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8"
  );

  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(argv) {
  const options = {
    help: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--list-published") {
      options.listPublished = true;
      continue;
    }
    if (arg === "--delete-published") {
      options.deletePublished = true;
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

function printHelp() {
  console.log(`Usage:
  npm run html:publish -- [--path my-page] [--html-file path/to/file.html]
  npm run html:publish -- [--path my-page] [--html "<h1>Hello</h1>"]

Primitives:
  npm run html:stage -- --title "Lower A" --html-file output/training-plans/lower-a.html
  npm run html:deploy-site
  npm run html:list-published
  npm run html:delete-published -- --path 2026-06-05-lower-a-01abcxyz

Options:
  --project    Cloudflare Pages project name. Defaults to config/env or "${defaultProjectName}".
  --section    Top-level URL section. Defaults to config/env or "${defaultSection}".
  --slug       Optional readable slug. Defaults to the title, normalized.
  --path       Optional full path segment. Defaults to YYYY-MM-DD-slug-sortableid.
  --html-file  Path to an HTML file to publish.
  --html       Inline HTML or markup fragment to publish.
  --title      Used when wrapping a fragment or generating the default page.
  --dry-run    Generate files and print the derived URL without deploying.
  --list-published  Print published page metadata from the local site tree.
  --delete-published  Remove one published page from the local site tree, then redeploy unless --dry-run.
  --help       Show this help.

Config:
  TRAINING_GENERATOR_CONFIG     Optional config path. Defaults to ${defaultConfigPath}.
  CLOUDFLARE_PAGES_PROJECT      Override Pages project name.
  CLOUDFLARE_PAGES_BASE_URL     Override base URL, useful for dry runs and custom domains.
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
