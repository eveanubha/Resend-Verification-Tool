import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isSafeUrl(raw) {
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const h = u.hostname;
    if (h === "localhost" || h.endsWith(".local")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
    return true;
  } catch {
    return false;
  }
}

async function xp(page, xpath, timeout = 15000) {
  return page.waitForSelector(`::-p-xpath(${xpath})`, { timeout, visible: true });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ status: "error", message: "POST only" });

  // Shared password so strangers can't use your deployment
  const expected = process.env.APP_PASSWORD;
  if (!expected || req.headers["x-app-password"] !== expected) {
    return res.status(401).json({ status: "error", message: "Wrong or missing password" });
  }

  const { email, url, emailXpath, submitXpath, followupXpath, closeXpath, errorText } = req.body || {};
  if (!email || !url || !emailXpath || !submitXpath) {
    return res.status(400).json({ status: "error", message: "email, url, emailXpath, submitXpath are required" });
  }
  if (!isSafeUrl(url)) return res.status(400).json({ status: "error", message: "Invalid URL" });

  let browser;
  try {
    browser = await puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
      defaultViewport: { width: 1920, height: 1080 },
    });
    const page = await browser.newPage();
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    if (resp && resp.status() === 429) return res.json({ status: "rate_limited", email });

    const emailEl = await xp(page, emailXpath);
    await emailEl.click({ clickCount: 3 });
    await emailEl.type(email, { delay: 20 });

    const submitEl = await xp(page, submitXpath);
    await submitEl.click();
    await sleep(2000);

    if (errorText) {
      const body = await page.evaluate(() => document.body.innerText);
      if (body.includes(errorText)) return res.json({ status: "invalid", email, message: errorText });
    }

    if (followupXpath) {
      const f = await xp(page, followupXpath);
      await f.click();
      await sleep(2000);
    }
    if (closeXpath) {
      try {
        const c = await xp(page, closeXpath, 5000);
        await c.click();
      } catch {
        /* optional */
      }
    }

    return res.json({ status: "processed", email });
  } catch (err) {
    return res.json({ status: "error", email, message: String(err.message || err).slice(0, 300) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
