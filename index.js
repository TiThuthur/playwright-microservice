import express from "express";
import cors from "cors";
import { chromium } from "playwright";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Fonction pour parser et séparer le HTML
function parseHTML(html) {
  const sections = {
    head: "",
    body: "",
    title: "",
    meta: [],
    links: [],
    scripts: [],
  };

  // Extraire le titre
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) {
    sections.title = titleMatch[1].trim();
  }

  // Extraire les balises meta
  const metaMatches = html.match(/<meta[^>]*>/gi);
  if (metaMatches) {
    sections.meta = metaMatches;
  }

  // Extraire les liens
  const linkMatches = html.match(/<link[^>]*>/gi);
  if (linkMatches) {
    sections.links = linkMatches;
  }

  // Extraire les scripts
  const scriptMatches = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
  if (scriptMatches) {
    sections.scripts = scriptMatches;
  }

  // Extraire la section head
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    sections.head = headMatch[1].trim();
  }

  // Extraire la section body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    sections.body = bodyMatch[1].trim();
  }

  return sections;
}

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
    const parsedHTML = parseHTML(content);

    res.json({
      url: url,
      html: content,
      sections: parsedHTML,
    });
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
