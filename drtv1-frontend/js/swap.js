
const registryUrl = "https://raw.githubusercontent.com/Jordan702/DRTv1/main/drtv1-frontend/tokenRegistry.json";
const coingeckoUrl = "https://api.coingecko.com/api/v3/simple/price?ids=";
const coingeckoSuffix = "&vs_currencies=usd";

async function fetchRegistry() {
  const res = await fetch(registryUrl);
  return await res.json();
}

async function fetchPrices(tokens) {
  const coingeckoIds = tokens.map(t => t.coingeckoId).filter(Boolean);
  let priceMap = {};

  if (coingeckoIds.length > 0) {
    const res = await fetch(coingeckoUrl + coingeckoIds.join('%2C') + coingeckoSuffix);
    priceMap = await res.json();
  }

  return priceMap;
}

function createRow(token, priceData) {
  const row = document.createElement('tr');

  const logoCell = document.createElement('td');
  const logo = document.createElement('img');
  logo.src = token.logo || "";
  logo.alt = token.name || "";
  logo.style.height = '30px';
  logo.style.borderRadius = '50%';
  logoCell.appendChild(logo);

  const nameCell = document.createElement('td');
  nameCell.textContent = `${token.name || 'Unnamed'} (${token.ticker || 'N/A'})`;

  const categoryCell = document.createElement('td');
  const badge = document.createElement('span');
  const cat = token.category || 'Unknown';
  badge.className = `badge category-${cat}`;
  badge.textContent = cat;
  categoryCell.appendChild(badge);

  const scoreCell = document.createElement('td');
  scoreCell.textContent = token.impactScore ?? 'N/A';

  const priceCell = document.createElement('td');
  const price = token.coingeckoId && priceData?.[token.coingeckoId]?.usd;
  priceCell.textContent = price ? `$${price.toFixed(2)}` : 'N/A';

  const actionCell = document.createElement('td');
  const btn = document.createElement('button');
  btn.className = 'action-btn';
  btn.textContent = 'View';
  btn.onclick = () => window.location.href = `tokeninfo.html?ticker=${token.ticker}`;
  actionCell.appendChild(btn);

  row.appendChild(logoCell);
  row.appendChild(nameCell);
  row.appendChild(categoryCell);
  row.appendChild(scoreCell);
  row.appendChild(priceCell);
  row.appendChild(actionCell);

  return row;
}

async function renderTokens() {
  try {
    const container = document.getElementById("token-list");
    const data = await fetchRegistry();
    const tokenArray = Object.values(data);

    tokenArray.sort((a, b) => (a.category || "").localeCompare(b.category || ""));

    const prices = await fetchPrices(tokenArray);

    tokenArray.forEach(token => {
      container.appendChild(createRow(token, prices));
    });
  } catch (err) {
    console.error("Token render error:", err);
  }
}

document.getElementById('search').addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll('tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
});

renderTokens();
