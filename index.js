import express from "express";
import cors from "cors";
import { chromium } from "playwright";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Debug route pour tester le service
app.get("/ping", (req, res) => {
  res.json({ status: "ok", message: "Playwright service is running" });
});

// Scraping route
app.post("/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    console.log(`Navigating to: ${url}`);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const content = await page.content();
    res.json({ html: content });
  } catch (err) {
    console.error("Scraping error:", err.message);
    res.status(500).json({
      error: "Failed to scrape page",
      details: err.message,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(3000, () => {
  console.log("✅ Playwright API running on port 3000");
});
