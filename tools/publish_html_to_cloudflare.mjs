import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import QRCode from "qrcode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const defaultProjectName = "training-site";
const siteRoot = path.join(workspaceRoot, "output", "cloudflare-pages", "site");
const pagesOutputDir = path.join(workspaceRoot, ".wrangler-output");
const defaultSection = "training";
const defaultSlug = "session";
const crockfordBase32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const defaultConfigPath = path.join(
  workspaceRoot,
  "config",
  "training-generator.local.json"
);
const exampleConfigPath = path.join(
  workspaceRoot,
  "config",
  "training-generator.example.json"
);

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const workspaceConfig = await loadWorkspaceConfig();
  const projectName =
    options.project ??
    process.env.CLOUDFLARE_PAGES_PROJECT ??
    workspaceConfig.pagesProject ??
    defaultProjectName;
  const section = sanitizePathSegment(
    options.section ??
    workspaceConfig.pagesSection ??
    defaultSection
  );
  const baseUrl =
    process.env.CLOUDFLARE_PAGES_BASE_URL?.trim() ||
    workspaceConfig.pagesBaseUrl?.trim() ||
    `https://${projectName}.pages.dev`;

  if (options.listPublished) {
    const pages = await collectPublishedPages(baseUrl, options.section ? section : null);
    console.log(
      JSON.stringify(
        {
          projectName,
          section: options.section ? section : null,
          baseUrl,
          pages,
        },
        null,
        2
      )
    );
    return;
  }

  const rawHtml = await loadHtml(options);
  const resolvedTitle =
    options.title ?? extractHtmlTitle(rawHtml) ?? deriveTitleFromHtmlFile(options.htmlFile) ?? "training-session";
  const pageId = options.pathSegment ?? buildPagePathSegment(resolvedTitle, options.slug);
  const publishBaseUrl = options.dryRun ? baseUrl : await resolveProductionBaseUrl(projectName);
  const relativePagePath = path.join(section, pageId);
  const pageDir = path.join(siteRoot, relativePagePath);
  const indexPath = path.join(pageDir, "index.html");
  const qrCodePath = path.join(pageDir, "qr.png");
  const outputCapturePath = path.join(pagesOutputDir, `${pageId}.ndjson`);
  const pageUrl = `${publishBaseUrl}/${toUrlPath(relativePagePath)}/`;

  await mkdir(pageDir, { recursive: true });
  await mkdir(pagesOutputDir, { recursive: true });

  const finalHtml = normalizeHtml(rawHtml, resolvedTitle);

  await writeFile(indexPath, finalHtml, "utf8");
  await QRCode.toFile(qrCodePath, pageUrl, {
    type: "png",
    margin: 1,
    width: 768,
    color: {
      dark: "#111111",
      light: "#ffffffff",
    },
  });
  await refreshIndexPage(publishBaseUrl);

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          projectName,
          section,
          pageId,
          pageUrl,
          qrCodePath,
          baseUrl: publishBaseUrl,
          configPath: workspaceConfig.__configPath ?? null,
          siteRoot,
          outputCapturePath,
        },
        null,
        2
      )
    );
    return;
  }

  const deployArgs = [
    "wrangler",
    "pages",
    "deploy",
    siteRoot,
    "--project-name",
    projectName,
    "--branch",
    "main",
  ];

  const env = {
    ...process.env,
    WRANGLER_OUTPUT_FILE_PATH: outputCapturePath,
  };

  const { stdout, stderr, exitCode } = await runCommand("npx", deployArgs, {
    cwd: workspaceRoot,
    env,
  });

  if (exitCode !== 0) {
    throw new Error(
      `Wrangler deploy failed with exit code ${exitCode}.\n${stderr || stdout}`.trim()
    );
  }

  const structuredOutput = await safeReadFile(outputCapturePath);
  const deploymentUrl =
    findFirstUrl(structuredOutput, projectName) ??
    findFirstUrl(stdout, projectName) ??
    findFirstUrl(stderr, projectName);

  const result = {
    deployedAt: new Date().toISOString(),
    projectName,
    section,
    pageId,
    pageUrl,
    qrCodePath,
    baseUrl: publishBaseUrl,
    configPath: workspaceConfig.__configPath ?? null,
    deploymentUrl,
    siteRoot,
    outputCapturePath,
  };

  await writeFile(
    path.join(pageDir, "deployment.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8"
  );

  console.log(JSON.stringify(result, null, 2));
}

async function loadWorkspaceConfig() {
  const preferredPath = process.env.TRAINING_GENERATOR_CONFIG
    ? path.resolve(workspaceRoot, process.env.TRAINING_GENERATOR_CONFIG)
    : defaultConfigPath;
  const resolvedPath = (await fileExists(preferredPath))
    ? preferredPath
    : (await fileExists(exampleConfigPath))
      ? exampleConfigPath
      : null;

  if (!resolvedPath) {
    return {};
  }

  const payload = JSON.parse(await readFile(resolvedPath, "utf8"));
  return {
    ...payload,
    __configPath: resolvedPath,
  };
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

async function resolveProductionBaseUrl(projectName) {
  const { stdout, stderr, exitCode } = await runCommand(
    "npx",
    ["wrangler", "pages", "project", "list", "--json"],
    { cwd: workspaceRoot, env: process.env }
  );

  if (exitCode !== 0) {
    throw new Error(`Failed to list Pages projects.\n${stderr || stdout}`.trim());
  }

  const projects = JSON.parse(stdout);
  const project = projects.find((entry) => entry["Project Name"] === projectName);

  if (!project) {
    throw new Error(`Could not find Pages project "${projectName}" in Wrangler output.`);
  }

  const domain = String(project["Project Domains"] ?? "")
    .split(",")[0]
    .trim();

  if (!domain) {
    throw new Error(`Could not resolve production URL for Pages project "${projectName}".`);
  }

  return `https://${domain}`.replace(/\/$/, "");
}

async function loadHtml(options) {
  if (options.htmlFile) {
    return readFile(path.resolve(workspaceRoot, options.htmlFile), "utf8");
  }
  if (options.html) {
    return options.html;
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f3ea;
        --panel: #fffaf1;
        --ink: #1d2733;
        --accent: #285943;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(40, 89, 67, 0.14), transparent 28%),
          linear-gradient(180deg, var(--bg), #eee5d6);
      }
      main {
        width: min(720px, calc(100vw - 32px));
        padding: 40px;
        border-radius: 24px;
        background: var(--panel);
        border: 1px solid rgba(29, 39, 51, 0.08);
        box-shadow: 0 24px 60px rgba(29, 39, 51, 0.08);
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(2rem, 4vw, 3.4rem);
        line-height: 0.95;
      }
      p {
        margin: 0;
        font-size: 1.05rem;
        line-height: 1.6;
      }
      strong { color: var(--accent); }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(options.title)}</h1>
      <p>This page was published into a stable Cloudflare Pages site and is available at its own path.</p>
    </main>
  </body>
</html>`;
}

function normalizeHtml(html, title) {
  const trimmed = html.trim();
  if (/<!doctype html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
${trimmed}
  </body>
</html>`;
}

function buildPagePathSegment(title, slugOverride) {
  const datePart = buildDateSlug();
  const slugPart = sanitizeSlug(slugOverride ?? title ?? defaultSlug);
  const sortableId = buildSortableId();
  return `${datePart}-${slugPart}-${sortableId.toLowerCase()}`;
}

function sanitizePathSegment(value) {
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
  if (!cleaned) {
    throw new Error("Invalid --path value. Use letters, numbers, hyphens, or underscores.");
  }
  return cleaned;
}

function sanitizeSlug(value) {
  const cleaned = sanitizePathSegment(value);
  return cleaned.slice(0, 48);
}

function extractHtmlTitle(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1]?.trim() || null;
}

function deriveTitleFromHtmlFile(htmlFile) {
  if (!htmlFile) return null;
  return path.basename(htmlFile, path.extname(htmlFile)).replaceAll("-", " ");
}

function buildDateSlug() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildSortableId(date = new Date()) {
  let time = date.getTime();
  let id = "";

  for (let i = 0; i < 10; i += 1) {
    id = crockfordBase32[time % 32] + id;
    time = Math.floor(time / 32);
  }

  const random = randomBytes(8);
  for (const byte of random) {
    id += crockfordBase32[byte % 32];
  }

  return id;
}

async function refreshIndexPage(baseUrl) {
  const groupedPages = await collectPublishedGroups();

  const items = groupedPages
    .map(({ dirName, pageItems }) => {
      if (pageItems.length === 0) {
        return `        <li>${escapeHtml(dirName)}</li>`;
      }

      const links = pageItems
        .map(
          (page) =>
            `          <li><a href="${baseUrl}/${dirName}/${page}/">${escapeHtml(
              `${dirName}/${page}`
            )}</a></li>`
        )
        .join("\n");

      return `        <li>${escapeHtml(dirName)}</li>
        <ul>
${links}
        </ul>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Training Pages</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4efe6;
        --panel: #fffaf2;
        --ink: #1f2a36;
        --line: rgba(31, 42, 54, 0.1);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background: linear-gradient(180deg, var(--bg), #ebe2d3);
        color: var(--ink);
        font-family: Georgia, "Times New Roman", serif;
      }
      main {
        width: min(760px, calc(100vw - 32px));
        margin: 40px auto;
        padding: 32px;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(2rem, 4vw, 3rem);
      }
      p {
        margin: 0 0 20px;
        line-height: 1.6;
      }
      ul {
        margin: 0;
        padding-left: 20px;
      }
      li + li {
        margin-top: 10px;
      }
      a {
        color: inherit;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Training Pages</h1>
      <p>Published training sessions on this Cloudflare Pages site.</p>
      <ul>
${items || "        <li>No pages published yet.</li>"}
      </ul>
    </main>
  </body>
</html>`;

  await mkdir(siteRoot, { recursive: true });
  await writeFile(path.join(siteRoot, "index.html"), html, "utf8");
}

async function collectPublishedGroups() {
  const entries = await readdir(siteRoot, { withFileTypes: true }).catch(() => []);
  const rootDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  const groupedPages = [];
  for (const dirName of rootDirs) {
    const childEntries = await readdir(path.join(siteRoot, dirName), {
      withFileTypes: true,
    }).catch(() => []);
    const pageItems = childEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse();

    groupedPages.push({
      dirName,
      pageItems,
    });
  }

  return groupedPages;
}

async function collectPublishedPages(baseUrl, sectionFilter = null) {
  const groups = await collectPublishedGroups();
  const pages = [];
  for (const group of groups) {
    if (sectionFilter && group.dirName !== sectionFilter) continue;
    for (const pageId of group.pageItems) {
      const relativePagePath = path.join(group.dirName, pageId);
      pages.push({
        section: group.dirName,
        pageId,
        pageUrl: `${baseUrl}/${toUrlPath(relativePagePath)}/`,
        pageDir: path.join(siteRoot, relativePagePath),
        qrCodePath: path.join(siteRoot, relativePagePath, "qr.png"),
        deploymentPath: path.join(siteRoot, relativePagePath, "deployment.json"),
      });
    }
  }
  return pages;
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode });
    });
  });
}

async function safeReadFile(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function fileExists(filePath) {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

function findFirstUrl(text, projectName) {
  if (!text) return null;

  const matches = text.match(/https:\/\/[^\s"]+/g) ?? [];
  const preferred = matches.find(
    (candidate) =>
      candidate.includes(`${projectName}.pages.dev`) || candidate.includes(".pages.dev")
  );
  return preferred ?? matches[0] ?? null;
}

function toUrlPath(fileSystemPath) {
  return fileSystemPath.split(path.sep).join("/");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function printHelp() {
  console.log(`Usage:
  npm run html:publish -- [--path my-page] [--html-file path/to/file.html]
  npm run html:publish -- [--path my-page] [--html "<h1>Hello</h1>"]

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
  --help       Show this help.

Config:
  TRAINING_GENERATOR_CONFIG     Optional config path. Defaults to config/training-generator.local.json.
  CLOUDFLARE_PAGES_PROJECT      Override Pages project name.
  CLOUDFLARE_PAGES_BASE_URL     Override base URL, useful for dry runs and custom domains.
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
