import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const toolPath = "tools/json-ld-generator/index.html";
const proPath = "assets/pro/jsonld-pro.js";
const canonical = "https://nymrel.com/tools/json-ld-generator";
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function filesUnder(path) {
  const absolute = join(root, path);
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = join(absolute, entry.name);
    if (entry.isDirectory()) return filesUnder(relative(root, child));
    return [relative(root, child).replaceAll("\\", "/")];
  });
}

const requiredFiles = [
  "favicon.svg",
  "LICENSE",
  "README.md",
  "assets/checkout-config.js",
  "assets/site.css",
  "assets/site.js",
  "assets/fonts/fonts.css",
  "assets/pro/pro-runtime.js",
  proPath,
  toolPath,
];
for (const path of requiredFiles) {
  check(existsSync(join(root, path)), `missing required file: ${path}`);
}

const html = read(toolPath);
const proSource = read(proPath);
const readme = read("README.md");
const security = read("SECURITY.md");
const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
check(/<html\b[^>]*\blang="en"/i.test(html), "document must declare lang=en");
check(head.length > 0, "document must contain a head element");
check((head.match(/<title\b/gi) ?? []).length === 1, "document head must contain exactly one title");
check((html.match(/<h1\b/gi) ?? []).length === 1, "document must contain exactly one h1");
check((html.match(/<main\b/gi) ?? []).length === 1, "document must contain exactly one main landmark");
check(/<meta\s+name="description"\s+content="[^"]+"/i.test(html), "meta description is required");
check(
  new RegExp(`<link\\s+rel="canonical"\\s+href="${canonical}"`, "i").test(html),
  `canonical must be ${canonical}`,
);
check(/Vercel Web Analytics/i.test(html), "page privacy copy must disclose hosted Vercel Web Analytics");
check(/Vercel Web Analytics/i.test(readme), "README privacy copy must disclose hosted Vercel Web Analytics");
check(/local storage/i.test(`${html}\n${readme}\n${security}`), "local persistence must be documented");
check(!/the tool makes no server calls/i.test(`${html}\n${readme}`), "privacy copy must not deny all server requests");
check(!/never sent to a server/i.test(html), "page privacy copy must not make an absolute transport claim");

// Ignore script source while inspecting IDs; do not transform HTML as if sanitized.
const scriptRanges = [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi)]
  .map((match) => [match.index, match.index + match[0].length]);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)]
  .filter((match) => !scriptRanges.some(([start, end]) => match.index >= start && match.index < end))
  .map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
check(duplicateIds.length === 0, `duplicate element ids: ${duplicateIds.join(", ")}`);

const jsonLdBlocks = [
  ...head.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi),
];
check(jsonLdBlocks.length >= 1, "at least one JSON-LD block is required");
for (const [index, block] of jsonLdBlocks.entries()) {
  try {
    JSON.parse(block[1]);
  } catch (error) {
    failures.push(`JSON-LD block ${index + 1} is invalid: ${error.message}`);
  }
}

const inlineScripts = [
  ...html.matchAll(
    /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi,
  ),
];
for (const [index, script] of inlineScripts.entries()) {
  try {
    new vm.Script(script[1], { filename: `${toolPath}:inline-${index + 1}` });
  } catch (error) {
    failures.push(`inline script ${index + 1} has invalid syntax: ${error.message}`);
  }
}

const javascriptFiles = filesUnder("assets").filter((path) => path.endsWith(".js"));
for (const path of javascriptFiles) {
  try {
    new vm.Script(read(path), { filename: path });
  } catch (error) {
    failures.push(`${path} has invalid syntax: ${error.message}`);
  }
}

const serializerSources = `${html}\n${proSource}`;
const safeReplacementSource = '.replace(/</g, "\\\\u003c")';
check(
  (serializerSources.split(safeReplacementSource).length - 1) === 2,
  "free and Pro serializers must both encode literal < as \\u003c",
);
check(
  (serializerSources.match(/JSON\.stringify\(data, null, 2\)/g) ?? []).length === 2,
  "JSON.stringify(data) may only appear inside the two guarded serializer helpers",
);
check(
  html.includes("var json = serializeJsonForHtmlScript(data);"),
  "free output must use the guarded serializer",
);
check(
  /function snippetFor\(data\)\s*\{[\s\S]{0,240}serializeJsonForHtmlScript\(data\)/.test(proSource),
  "Pro output must use the guarded serializer",
);
const hostileValue = "</script><img src=x onerror=alert(1)>";
const safeJson = JSON.stringify({ name: hostileValue }, null, 2).replace(/</g, "\\u003c");
check(!/<\/script/i.test(safeJson), "guarded serialization must remove raw script end tags");
check(JSON.parse(safeJson).name === hostileValue, "guarded serialization must preserve parsed JSON values");

const assetReferences = [
  ...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(\/[^"]+)"[^>]*>/gi),
].map((match) => match[1].split(/[?#]/, 1)[0]);
for (const reference of assetReferences) {
  if (reference === "/_vercel/insights/script.js") continue;
  const localPath = reference.replace(/^\//, "");
  check(existsSync(join(root, localPath)), `missing local asset referenced by HTML: ${reference}`);
}

for (const path of filesUnder("assets").filter((candidate) => candidate.endsWith(".css"))) {
  const css = read(path);
  for (const match of css.matchAll(/url\(["']?([^)"]+)["']?\)/gi)) {
    const reference = match[1].trim().split(/[?#]/, 1)[0];
    if (/^(?:data:|https?:)/i.test(reference)) continue;
    const target = reference.startsWith("/")
      ? resolve(root, reference.replace(/^\//, ""))
      : resolve(dirname(join(root, path)), reference);
    check(target.startsWith(root), `CSS asset escapes repository root in ${path}: ${reference}`);
    check(existsSync(target), `missing local asset referenced by ${path}: ${reference}`);
  }
}

const checkoutTemplate = read("assets/checkout-config.js");
check(
  !/buy\.stripe\.com/i.test(checkoutTemplate),
  "public source checkout template must not embed live payment links",
);

const workflowFiles = filesUnder(".github/workflows").filter((path) => /\.ya?ml$/i.test(path));
for (const path of workflowFiles) {
  const workflow = read(path);
  for (const use of workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)) {
    check(/@[0-9a-f]{40}$/i.test(use[1]), `workflow action must use an immutable SHA in ${path}: ${use[1]}`);
  }
}

const textFiles = [
  toolPath,
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  ...javascriptFiles,
  ...filesUnder("assets").filter((path) => path.endsWith(".css")),
];
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
];
for (const path of textFiles) {
  const content = read(path);
  for (const pattern of secretPatterns) {
    check(!pattern.test(content), `possible secret in ${path}: ${pattern}`);
  }
}

for (const path of requiredFiles) {
  const absolute = join(root, path);
  check(
    !existsSync(absolute) || statSync(absolute).isFile(),
    `required path is not a regular file: ${path}`,
  );
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      tool: "json-ld-generator",
      canonical,
      required_files: requiredFiles.length,
      javascript_files: javascriptFiles.length,
      inline_scripts: inlineScripts.length,
      json_ld_blocks: jsonLdBlocks.length,
      asset_references: assetReferences.length,
      html_sha256: createHash("sha256").update(html).digest("hex"),
    },
    null,
    2,
  ),
);
