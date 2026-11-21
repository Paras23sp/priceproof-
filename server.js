import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();
const app = express();
app.use(cors({ origin: ['http://localhost:5173'] }));
app.use(express.json());
const PORT = process.env.PORT || 5000;

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'PriceProof API' }));

// Normalize the provider response without assuming a single fixed response shape.
function collectProducts(value, out = [], depth = 0) {
  if (!value || depth > 7) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectProducts(item, out, depth + 1);
    return out;
  }
  if (typeof value !== 'object') return out;
  const keys = Object.keys(value).map(k => k.toLowerCase());
  const looksLikeProduct = keys.some(k => ['name', 'title', 'product_name'].includes(k)) &&
    keys.some(k => ['price', 'offer_price', 'selling_price', 'current_price'].includes(k));
  if (looksLikeProduct) out.push(value);
  else for (const child of Object.values(value)) collectProducts(child, out, depth + 1);
  return out;
}
function first(obj, names) {
  for (const name of names) if (obj?.[name] !== undefined && obj?.[name] !== null && obj?.[name] !== '') return obj[name];
  return undefined;
}
function normalizeProduct(p, index) {
  const rawPrice = first(p, [
    'offer_price', 'price', 'selling_price',
    'current_price', 'sale_price'
  ]);

  const price = Number(
    String(rawPrice ?? '').replace(/[^0-9.]/g, '')
  );

  const rawMrp = first(p, ['mrp', 'original_price', 'regular_price']);
  const mrp = Number(
    String(rawMrp ?? '').replace(/[^0-9.]/g, '')
  );

  const rawImages = first(p, [
    'images', 'image', 'image_url', 'thumbnail', 'img'
  ]);

  const image = Array.isArray(rawImages)
    ? rawImages.find(url => typeof url === 'string' && url.startsWith('http'))
    : typeof rawImages === 'string'
      ? rawImages
      : null;

  const rawPlatform = first(p, [
    'platform', 'store', 'merchant', 'source'
  ]);

  const platform = typeof rawPlatform === 'object' && rawPlatform !== null
    ? rawPlatform.name || 'Store'
    : rawPlatform || 'Store';

  return {
    id: String(first(p, ['id', 'product_id', 'sku']) ?? index),
    name: String(first(p, ['name', 'title', 'product_name']) ?? 'Product listing'),
    brand: first(p, ['brand']) || '',
    price: Number.isFinite(price) && price > 0 ? price : null,
    mrp: Number.isFinite(mrp) && mrp > 0 ? mrp : null,
    rating: first(p, ['rating', 'average_rating']) ?? null,
    image,
    url: first(p, ['deeplink', 'deepLink', 'url', 'product_url', 'link']) ?? null,
    platform,
    availability: p.available ?? p.availability ?? p.in_stock ?? p.is_available ?? null
  };
}

app.get('/api/products', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Please enter a product to search.' });
  if (!process.env.QC_API_KEY || process.env.QC_API_KEY.includes('PASTE_')) {
    return res.status(503).json({ error: 'QuickCommerceAPI key missing. Add QC_API_KEY to backend/.env and restart the server.' });
  }
  const platforms = String(req.query.platforms || 'Amazon,Flipkart');
  const params = new URLSearchParams({
    q,
    lat: String(req.query.lat || process.env.LAT || '26.9124'),
    lon: String(req.query.lon || process.env.LON || '75.7873'),
    platforms,
    group: 'false'
  });
  try {
    const response = await fetch(`https://api.quickcommerceapi.com/v1/groupsearch?${params}`, {
      headers: { 'X-API-Key': process.env.QC_API_KEY }
    });
    const raw = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: raw?.message || raw?.error || 'Product provider request failed', details: raw });
    const products = collectProducts(raw).map(normalizeProduct);
    res.json({ query: q, products, raw });
  } catch (error) {
    res.status(502).json({ error: 'Could not reach product data provider.', details: error.message });
  }
});

app.post('/api/assistant', async (req, res) => {
  const { message, products = [] } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message is required.' });
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('OPTIONAL_')) {
    return res.status(503).json({ error: 'Gemini key not configured yet. Product search and comparison work without it.' });
  }
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `You are PriceProof's shopping assistant. Only use the product data below for price claims. If data is missing, say so. Help the user compare value, not just lowest price.\nProducts: ${JSON.stringify(products).slice(0, 14000)}\nUser: ${message}`
    });
    res.json({ answer: result.text || 'I could not generate a recommendation.' });
  } catch (error) {
  console.error('GEMINI ERROR:', error);
  res.status(502).json({
    error: 'AI assistant request failed.',
    details: error.message
  });
}
});
app.get('/api/models', async (req, res) => {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const models = [];

    for await (const model of ai.models.list()) {
      if (model.supportedActions?.includes('generateContent')) {
        models.push(model.name);
      }
    }

    res.json({ models });
  } catch (error) {
    console.error('MODEL LIST ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});
app.listen(PORT, () => console.log(`PriceProof backend running at http://localhost:${PORT}`));
