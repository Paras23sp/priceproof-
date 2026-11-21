import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Search, ShieldCheck, Sparkles, ArrowUpRight, Heart, SlidersHorizontal, Zap, TrendingDown, ShoppingBag, Menu, X } from 'lucide-react';
import './style.css';

function App() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [comparisonResults, setComparisonResults] = useState([]);
const [comparisonLoading, setComparisonLoading] = useState(false);
const [comparisonError, setComparisonError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [platforms, setPlatforms] = useState(['Amazon', 'Flipkart']);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const sorted = useMemo(() => [...products].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)), [products]);
  const lowest = sorted.find(p => p.price !== null);
  const comparisonProducts = selectedProduct
  ? products.filter(p => {
      const clean = value => String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      const selectedName = clean(selectedProduct.name);
      const currentName = clean(p.name);

      return (
        p.brand &&
        selectedProduct.brand &&
        clean(p.brand) === clean(selectedProduct.brand) &&
        (selectedName.includes(currentName) ||
         currentName.includes(selectedName))
      );
    })
  : [];

  async function search(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setSearched(true); setProducts([]);
    try {
      const params = new URLSearchParams({ q: query.trim(), platforms: platforms.join(',') });
      const response = await fetch(`http://localhost:5000/api/products?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search failed');
      setProducts(data.products || []);
      if (!(data.products || []).length) setError('The provider returned a response, but this starter could not identify product cards in its data format. Open the raw response in the backend and adjust the field mapping.');
    } catch (err) { setError(err.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  }
  async function compareProduct(product) {
  setSelectedProduct(product);
  setComparisonResults([]);
  setComparisonError('');
  setComparisonLoading(true);

  try {
    const params = new URLSearchParams({
      q: product.name,
      platforms: 'Amazon,Flipkart'
    });

    const response = await fetch(
      `http://localhost:5000/api/products?${params}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Comparison search failed');
    }

    setComparisonResults(data.products || []);

    if (!(data.products || []).length) {
      setComparisonError('No matching store listings were found.');
    }
  } catch (err) {
    setComparisonError(err.message || 'Could not compare this product.');
  } finally {
    setComparisonLoading(false);
  }
}
function findStoreMatch(store) {
  if (!selectedProduct) return null;

  const ignoredWords = [
    'with', 'and', 'the', 'for', 'new',
    'buds', 'earbuds', 'bluetooth', 'wireless',
    'headphones', 'headset'
  ];

  const getTokens = name =>
    String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter(word => word.length > 1 && !ignoredWords.includes(word));

  const selectedTokens = getTokens(selectedProduct.name);

  const candidates = comparisonResults.filter(p =>
    String(p.platform || '').toLowerCase().includes(store.toLowerCase())
  );

  const matches = candidates.map(p => {
    const candidateTokens = getTokens(p.name);
    const shared = selectedTokens.filter(word =>
      candidateTokens.includes(word)
    );

    const score = shared.length /
      Math.max(1, Math.min(selectedTokens.length, candidateTokens.length));

    return { product: p, score, shared: shared.length };
  });

  return matches
    .filter(item => item.shared >= 2 && item.score >= 0.6)
    .sort((a, b) => b.score - a.score)[0]?.product || null;
}
  async function askAI(e) {
    e.preventDefault(); if (!message.trim()) return;
    setAiLoading(true); setAnswer('');
    try {
      const r = await fetch('http://localhost:5000/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, products }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'AI request failed'); setAnswer(d.answer);
    } catch (err) { setAnswer(err.message); } finally { setAiLoading(false); }
  }
  const money = n => n == null ? 'Price unavailable' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  return <div className="app-shell">
    <header className="nav"><a className="brand" href="#top"><span className="brand-mark"><TrendingDown size={21} /></span>price<span>proof</span></a><nav><a href="#how">How it works</a><a href="#results">Compare prices</a><a href="#about">About</a></nav><button className="nav-cta" onClick={() => setAssistantOpen(true)}><Sparkles size={16} /> AI Assistant</button></header>
    <main id="top">
      <section className="hero"><div className="eyebrow"><span className="pulse" /> SMARTER SHOPPING STARTS HERE</div><h1>Don't overpay.<br /><em>Know the real price.</em></h1><p className="hero-copy">Compare product prices across stores, spot better deals, and make confident buying decisions.</p>
        <form className="search-box" onSubmit={search}><Search size={21} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for a product... e.g. wireless earbuds" /><button type="submit" disabled={loading}>{loading ? 'Searching' : 'Compare prices'} <ArrowUpRight size={17} /></button></form>
        <div className="search-meta"><span><ShieldCheck size={15} /> Live listings from connected stores</span><span><Zap size={15} /> Compare in seconds</span></div>
        <div className="store-select"><span>SEARCH STORES</span>{['Amazon', 'Flipkart'].map(p => <button key={p} className={platforms.includes(p) ? 'store active' : 'store'} onClick={() => setPlatforms(old => old.includes(p) ? old.filter(x => x !== p) : [...old, p])} type="button"><span className="store-dot" />{p}</button>)}</div>
      </section>
      <section className="trust-strip"><div><strong>One search</strong><span>Multiple stores</span></div><div><strong>Clear prices</strong><span>Side-by-side comparison</span></div><div><strong>Smarter choices</strong><span>Less guesswork</span></div></section>
      {selectedProduct && (
  <section className="comparison-section">

    <div className="comparison-header">
      <div>
        <div className="eyebrow">PRICE COMPARISON</div>
        <h2>{selectedProduct.name}</h2>
      </div>

      <button
        className="comparison-back"
        onClick={() => setSelectedProduct(null)}
      >
        ← Back to products
      </button>
    </div>
{comparisonLoading && (
  <div className="state-card">
    <div className="loader" />
    Searching Amazon and Flipkart...
  </div>
)}

{comparisonError && !comparisonLoading && (
  <div className="error-card">
    {comparisonError}
  </div>
)}
    <div className="product-grid">
      {['Amazon', 'Flipkart'].map(store => {
const match = findStoreMatch(store);
        return (
          <article className="product-card" key={store}>
            <div className="product-info">
              <div className="product-brand">{store}</div> 

              {match ? (
                <>
                  <h3>{match.name}</h3>
                  <div className="price-row">
                    <strong>{money(match.price)}</strong>
                  </div>

                  {match.url && (
                    <a href={match.url} target="_blank" rel="noreferrer">
                      View on {store} ↗
                    </a>
                  )}
                </>
              ) : (
                <p className="comparison-unavailable">
                  Not available
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>

  </section>
)}
      <section className="results-section" id="results"><div className="section-heading"><div><div className="eyebrow">PRICE COMPARISON</div><h2>{searched ? `Results for “${query}”` : 'Find your best deal'}</h2></div>{searched && <span className="result-count">{products.length} listings found</span>}</div>
        {loading && <div className="state-card"><div className="loader" />Searching connected stores…</div>}
        {error && !loading && <div className="error-card">{error}<small>Check that the backend is running and your API key is configured in backend/.env.</small></div>}
        {!searched && <div className="empty-state"><div className="empty-icon"><ShoppingBag size={27} /></div><h3>Your next great deal is one search away.</h3><p>Search a product above to compare available listings from Amazon and Flipkart.</p></div>}
        {searched && !loading && !error && products.length > 0 && <><div className="best-deal"> <div className="best-icon"><TrendingDown size={20} /></div><div><b>Lowest listed price</b><span>{lowest?.name || 'Best available listing'}</span></div><strong>{money(lowest?.price)}</strong></div><div className="product-grid">{sorted.map((p, i) => <article className="product-card" key={`${p.platform}-${p.id}-${i}`}><div className="product-image">{p.image ? (
  <img
    src={p.image}
    alt={p.name}
    onError={e => {
      e.currentTarget.style.display = 'none';
      e.currentTarget.nextElementSibling.style.display = 'block';
    }}
  />
) : null}
<ShoppingBag
  size={32}
  style={{display: p.image ? 'none' : 'block'}}
/><span className="platform-tag">{typeof p.platform === "object" && p.platform !== null ? p.platform.name : p.platform}</span></div><div className="product-info"><div className="product-brand">{p.brand || (typeof p.platform === "object" && p.platform !== null ? p.platform.name : p.platform)}</div><h3>{p.name}</h3><div className="price-row"><strong>{money(p.price)}</strong>{p.mrp && <del>{money(p.mrp)}</del>}</div><div className="card-bottom"><span>{p.rating ? `★ ${p.rating}` : 'Listing found'}</span>{p.url ? <a href={p.url} target="_blank" rel="noreferrer">View deal <ArrowUpRight size={14} /></a> : <span>Link unavailable</span>}<button
  className="compare-btn"
  onClick={() => compareProduct(p)}
>
  Compare prices
</button></div></div></article>)}</div></>}
      </section>
      <section className="how-section" id="how"><div className="eyebrow">SIMPLE BY DESIGN</div><h2>Better buying, in three steps.</h2><div className="steps"><div><span>01</span><h3>Search</h3><p>Enter the product you want to buy.</p></div><div><span>02</span><h3>Compare</h3><p>See matching listings and prices from connected stores.</p></div><div><span>03</span><h3>Choose</h3><p>Open the retailer listing and make your purchase.</p></div></div></section>
    </main>
    <footer id="about"><a className="brand" href="#top"><span className="brand-mark"><TrendingDown size={19} /></span>price<span>proof</span></a><p>Compare thoughtfully. Shop confidently.</p><small>Prices and availability may change on retailer websites. Always verify before purchase.</small></footer>
    <button className="assistant-fab" onClick={() => setAssistantOpen(true)}><Sparkles size={19} /> Ask AI</button>
    {assistantOpen && <div className="modal-backdrop" onClick={() => setAssistantOpen(false)}><div className="assistant-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="ai-orb"><Sparkles size={17} /></span><b>PriceProof AI</b></div><button onClick={() => setAssistantOpen(false)}><X /></button></div><p className="modal-intro">Ask for help choosing between the products you found. AI recommendations use the current search results when available.</p><form onSubmit={askAI}><textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. Which option is best value under ₹2,000?" /><button disabled={aiLoading}>{aiLoading ? 'Thinking…' : 'Ask assistant'} <ArrowUpRight size={16} /></button></form>{answer && <div className="ai-answer">{answer}</div>}</div></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
