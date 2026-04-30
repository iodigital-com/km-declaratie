/**
 * Neemt een demovideo op van de km-declaratie app (Vite op localhost:5173).
 *
 * Gebruik:
 *   npm run demo:video
 *   (start Vite op poort 5173, wacht op HTTP 200, neemt op, stopt de server)
 *   Alleen opname als de app al draait: npm run demo:video:only
 *   Zorg dat poort 5173 vrij is (of zet DEMO_BASE_URL naar je eigen URL).
 *
 * Omgeving:
 *   DEMO_BASE_URL  (default http://localhost:5173/) — niet `BASE_URL`; die wordt vaak
 *                  door andere tools gezet en overschrijft dan per ongeluk deze URL.
 *   SLOW_MS   (default 450) extra pauze tussen stappen in ms
 */

import { chromium } from "playwright";
import { mkdir, rm, readdir, rename } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "demo-output");

const BASE_URL = process.env.DEMO_BASE_URL ?? "http://localhost:5173/";
const SLOW = Number(process.env.SLOW_MS ?? 450);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pace = () => wait(SLOW);

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  try {
    // `networkidle` past niet bij Vite (HMR); `load` is voldoende
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
  } catch (e) {
    await browser.close();
    console.error(
      "\nKon de app niet bereiken. Start eerst de dev-server:\n  npm run dev\n\n" +
        `Fout: ${e.message}\n`
    );
    process.exit(1);
  }

  const intro = async () => {
    await wait(2000);
    await pace();
  };

  await intro();

  // Instellingen tonen
  await page.getByRole("button", { name: /Instellingen/i }).click();
  await wait(2200);
  await pace();
  await page.getByRole("button", { name: /^Annuleer$/ }).click();
  await wait(900);
  await pace();

  // Maand / jaar (april 2026)
  const selects = page.locator("select");
  await selects.nth(0).selectOption("3");
  await selects.nth(1).selectOption("2026");
  await wait(600);
  await pace();

  // Enkele werkdagen aanklikken (april 2026)
  const cal = page.locator("table tbody");
  for (const day of [7, 8, 9]) {
    await cal.getByText(String(day), { exact: true }).click();
    await wait(350);
  }
  await wait(1200);
  await pace();

  // Alle werkdagen
  await page.getByRole("button", { name: /Alle werkdagen/i }).click();
  await wait(2000);
  await pace();

  // Preview
  await page.getByRole("button", { name: /Declaratie preview/i }).click();
  await wait(2500);
  await page.evaluate(() => window.scrollBy({ top: 320, behavior: "smooth" }));
  await wait(2000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await wait(1500);
  await pace();

  await page.close();
  await context.close();
  await browser.close();

  const files = (await readdir(outDir)).filter((f) => f.endsWith(".webm"));
  const recorded = files[0];
  if (!recorded) {
    console.error("Geen .webm gevonden in demo-output");
    process.exit(1);
  }

  const webmPath = join(outDir, "km-declaratie-demo.webm");
  await rename(join(outDir, recorded), webmPath);
  console.log(`Video: ${webmPath}`);

  const ff = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (ff.status === 0) {
    const mp4Path = join(outDir, "km-declaratie-demo.mp4");
    const r = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        webmPath,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        mp4Path,
      ],
      { encoding: "utf8" }
    );
    if (r.status === 0) {
      console.log(`MP4:  ${mp4Path}`);
    }
  } else {
    console.log("Tip: installeer ffmpeg voor automatische MP4-export (naast WebM).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
