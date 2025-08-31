import express from "express";
import cors from "cors";
import { chromium } from "playwright";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Fonction pour parser et décortiquer le body HTML
function parseHTML(html) {
  // Extraire uniquement la section body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) {
    return { body: "", elements: {} };
  }

  const bodyContent = bodyMatch[1].trim();

  // Objet pour stocker tous les éléments trouvés
  const elements = {
    headings: [], // h1, h2, h3, h4, h5, h6
    paragraphs: [], // p
    lists: [], // ul, ol, li
    tables: [], // table, tr, td, th
    divs: [], // div
    spans: [], // span
    sections: [], // section, article, aside, nav, header, footer
    media: [], // video, audio, iframe
    other: [], // autres balises
  };

  // Extraire les titres (h1-h6)
  const headingMatches = bodyContent.match(
    /<(h[1-6])[^>]*>([^<]*)<\/h[1-6]>/gi
  );
  if (headingMatches) {
    elements.headings = headingMatches.map((match) => {
      const tagMatch = match.match(/<(h[1-6])[^>]*>([^<]*)<\/h[1-6]>/i);
      return {
        tag: tagMatch[1],
        text: tagMatch[2].trim(),
        full: match,
      };
    });
  }

  // Extraire les paragraphes
  const paragraphMatches = bodyContent.match(
    /<p[^>]*>([^<]*(?:<[^>]*>[^<]*<\/[^>]*>[^<]*)*)<\/p>/gi
  );
  if (paragraphMatches) {
    elements.paragraphs = paragraphMatches.map((match) => {
      const textMatch = match.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      return {
        text: textMatch[1].replace(/<[^>]*>/g, "").trim(),
        full: match,
      };
    });
  }

  // Extraire les listes
  const listMatches = bodyContent.match(/<(ul|ol)[^>]*>[\s\S]*?<\/(ul|ol)>/gi);
  if (listMatches) {
    elements.lists = listMatches.map((match) => {
      const listTypeMatch = match.match(/<(ul|ol)[^>]*>/i);
      const listItems = match.match(
        /<li[^>]*>([^<]*(?:<[^>]*>[^<]*<\/[^>]*>[^<]*)*)<\/li>/gi
      );
      return {
        type: listTypeMatch[1],
        items: listItems
          ? listItems.map((item) => {
              const textMatch = item.match(/<li[^>]*>([\s\S]*?)<\/li>/i);
              return textMatch[1].replace(/<[^>]*>/g, "").trim();
            })
          : [],
        full: match,
      };
    });
  }

  // Extraire les tableaux
  const tableMatches = bodyContent.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
  if (tableMatches) {
    elements.tables = tableMatches.map((match) => {
      const rows = match.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
      return {
        rows: rows ? rows.length : 0,
        full: match,
      };
    });
  }

  // Extraire les divs
  const divMatches = bodyContent.match(/<div[^>]*>[\s\S]*?<\/div>/gi);
  if (divMatches) {
    elements.divs = divMatches.map((match) => {
      const classMatch = match.match(/class=["']([^"']*)["']/i);
      const idMatch = match.match(/id=["']([^"']*)["']/i);
      return {
        class: classMatch ? classMatch[1] : "",
        id: idMatch ? idMatch[1] : "",
        full: match,
      };
    });
  }

  // Extraire les sections principales
  const sectionMatches = bodyContent.match(
    /<(section|article|aside|nav|header|footer)[^>]*>[\s\S]*?<\/(section|article|aside|nav|header|footer)>/gi
  );
  if (sectionMatches) {
    elements.sections = sectionMatches.map((match) => {
      const tagMatch = match.match(
        /<(section|article|aside|nav|header|footer)[^>]*>/i
      );
      return {
        tag: tagMatch[1],
        full: match,
      };
    });
  }

  return {
    body: bodyContent,
    elements: elements,
  };
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
      body: parsedHTML.body,
      elements: parsedHTML.elements,
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
