import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import dotenv from "dotenv";

// Charger les variables d'environnement
dotenv.config();

const app = express();

// Middleware de sécurité
app.use(helmet());

// Middleware de compression
app.use(compression());

// Middleware CORS
app.use(cors());

// Limitation du taux de requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par fenêtre
  message: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard.",
});
app.use(limiter);

// Parser JSON avec limite
app.use(express.json({ limit: "10mb" }));

// POST /scrape
// Body: { url: "https://example.com" }
app.post("/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Récupérer le contenu HTML complet
    const content = await page.content();
    res.json({ html: content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to scrape page" });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Playwright API running on port ${PORT}`));
