import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const toolPath = "/tools/json-ld-generator/";
const sentinel = "nymrel-local-only-8675309";
const hostileName = `Nymrel ${sentinel} </script><img src=x onerror=alert(1)>`;

async function fillProduct(page, name = "Nymrel Test Product") {
  await page.locator("#schemaType").selectOption("Product");
  await page.locator("#f_name").fill(name);
  await page.locator("#f_price").fill("49.00");
  await expect(page.locator("#outputPre")).toBeVisible();
}

function parseGeneratedSnippet(snippet) {
  const match = snippet.match(
    /^<script type="application\/ld\+json">\n([\s\S]+)\n<\/script>$/,
  );
  expect(match).not.toBeNull();
  return JSON.parse(match[1]);
}

test.beforeEach(async ({ page }) => {
  await page.goto(toolPath, { waitUntil: "domcontentloaded" });
});

test("safely serializes hostile product text without transmitting it", async ({ page }) => {
  const leakedRequests = [];
  page.on("request", (request) => {
    const requestText = `${request.url()}\n${request.postData() ?? ""}`.toLowerCase();
    if (requestText.includes(sentinel)) {
      leakedRequests.push({ method: request.method(), url: request.url() });
    }
  });

  await fillProduct(page, hostileName);
  const snippet = await page.locator("#outputPre").textContent();
  expect(snippet).toContain("\\u003c/script>\\u003cimg");
  expect(snippet).not.toContain("</script><img");
  expect(snippet.match(/<\/script/gi)).toHaveLength(1);
  expect(parseGeneratedSnippet(snippet).name).toBe(hostileName);
  expect(leakedRequests).toEqual([]);
});

test("persists the active product draft only in browser local storage", async ({ page }) => {
  await fillProduct(page, hostileName);
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("jbt.jsonld.fields")));
  expect(persisted.Product.f_name).toBe(hostileName);
  expect(persisted.Product.f_price).toBe("49.00");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#schemaType")).toHaveValue("Product");
  await expect(page.locator("#f_name")).toHaveValue(hostileName);
  await expect(page.locator("#f_price")).toHaveValue("49.00");
});

test("reports valid, incomplete, and malformed JSON-LD accurately", async ({ page }) => {
  await page.locator("#modeCheckBtn").click();
  const input = page.locator("#checkInput");

  await input.fill(JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Verified product",
    image: "https://example.invalid/product.jpg",
    offers: { "@type": "Offer", price: "49.00", priceCurrency: "USD" },
  }));
  await page.locator("#checkBtn").click();
  await expect(page.locator("#outBody")).toContainText("Valid JSON");
  await expect(page.locator("#outBody .tag.bad")).toHaveCount(0);

  await input.fill(JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Incomplete product",
  }));
  await page.locator("#checkBtn").click();
  await expect(page.locator("#outBody")).toContainText("No offers field found");
  await expect(page.locator("#outBody .tag.bad")).not.toHaveCount(0);

  await input.fill('{"@context":');
  await page.locator("#checkBtn").click();
  await expect(page.locator("#outBody")).toContainText("Valid JSON");
  await expect(page.locator("#outBody .tag.bad")).not.toHaveCount(0);
});

test("downloads the guarded JSON-LD script block", async ({ page }) => {
  await fillProduct(page, hostileName);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#downloadBtn:visible, #abDownloadBtn:visible").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("json-ld-product.html");
  const content = await readFile(await download.path(), "utf8");
  expect(content).toContain("\\u003c/script>\\u003cimg");
  expect(content).not.toContain("</script><img");
  expect(parseGeneratedSnippet(content).name).toBe(hostileName);
});

test("has no serious accessibility violations after generation", async ({ page }) => {
  await fillProduct(page);
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(blocking).toEqual([]);
});

test("keeps the generated tool operable without horizontal overflow", async ({ page }) => {
  await fillProduct(page, `A long but valid ${sentinel} product name for responsive verification`);
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
});
