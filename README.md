# PriceProof starter

A React + Express starter for comparing product listings from QuickCommerceAPI, with an optional Gemini shopping assistant.

## 1) Requirements
- Node.js 20 or newer
- Your own QuickCommerceAPI key
- Optional Gemini API key from Google AI Studio

## 2) Install
Open a terminal in this folder and run:

```bash
npm install
npm run install:all
```

## 3) Add API keys safely
Copy `backend/.env.example` to `backend/.env`.

Windows PowerShell:
```powershell
Copy-Item backend/.env.example backend/.env
```

Open `backend/.env` and replace `QC_API_KEY` with your newly rotated QuickCommerceAPI key. Optionally add `GEMINI_API_KEY`. Do not paste keys into frontend code, screenshots, chat, or GitHub. The `.env` file is ignored by Git.

## 4) Run
From the project root:

```bash
npm run dev
```

Open http://localhost:5173. The backend runs at http://localhost:5000.

## Notes
- Search defaults to Amazon and Flipkart. Select stores in the UI before searching.
- The app sends the product query to `/v1/groupsearch` through the backend.
- Provider response formats can change. If the API returns products but the page cannot identify cards, inspect the `raw` response from `/api/products` and adjust `normalizeProduct()` in `backend/server.js` to the exact field names in your account's response.
- Prices and availability can change; always verify on the retailer page.
- This is a starter implementation. Add database-backed price history, accounts, wishlist and alert scheduling after live search is verified.
