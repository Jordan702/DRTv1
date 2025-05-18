# DRTv1 – Decentralized Resource Token

**"Evolution Through Contribution"**  
DRTv1 is a decentralized, AI-verified, resource-based cryptocurrency protocol that rewards individuals based on the value of real-world contributions. This is the first open-source system designed to autonomously mint ERC-20 tokens based on AI-assessed input validated by OCR and submitted via a user-friendly web portal.

---

## 🌐 Live Deployment
- **Submission Portal:** [jordan702.github.io/DRTv1/drtv1-frontend/index.html](https://jordan702.github.io/DRTv1/drtv1-frontend/index.html)
- **Backend API:** [drtv1-backend.onrender.com](https://drtv1-backend.onrender.com)
- **Smart Contract:** [`0x2c899a490902352aFa33baFb7fe89c9Dd142f9D1`](https://etherscan.io/address/0x2c899a490902352aFa33baFb7fe89c9Dd142f9D1)
- **View on GeckoTerminal:** [DRTv1/ETH Pool](https://www.geckoterminal.com/eth/pools/0x5fa10b1c1a3be5ad28a7f2c3836926aba5a9c120)

---

## 📦 Project Structure

```
DRTv1/
├── drtv1-frontend/       # HTML/CSS/JS for the submission portal
│   └── index.html
├── drtv1-backend/        # Node.js + Express server for AI evaluation and minting
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   └── index.js
├── DRT_abi.json          # Verified ABI for the DRTv1 contract
├── LICENSE
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 18+
- A funded Ethereum wallet with mint authority
- OpenAI API key and a Render.com account

### Environment Variables
Place the following in `.env`:

```
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
MINTER_PRIVATE_KEY=0xyourprivatekey
DRT_CONTRACT_ADDRESS=0x2c899a490902352aFa33baFb7fe89c9Dd142f9D1
OPENAI_API_KEY=sk-...
```

### Run Locally

```bash
cd drtv1-backend
npm install
node index.js
```

To run with **PM2**:
```bash
pm2 start index.js --name drtv1-backend
```

---

## 🛠️ CORS Notice
If accessing from a GitHub Page (like jordan702.github.io), you may encounter CORS restrictions depending on the browser.

✅ **Workaround**: Install a CORS browser extension such as:
- Chrome: "Allow CORS: Access-Control-Allow-Origin"

---

## 🤖 How It Works

1. A user submits a resource proof (image/pdf) + wallet + description.
2. The backend uses Tesseract.js to extract text (OCR).
3. The prompt is passed to OpenAI to evaluate USD value.
4. Tokens are calculated and minted to the user via the verified smart contract.

---

## 🧾 License
This project is [MIT Licensed](./LICENSE). DRTv1 is proudly open source and welcomes community collaboration.

---

## 🤝 Contribute / Contact

Built by Jordan702 as a proof-of-concept to explore contribution-based economies.

Want to help improve or expand DRTv1? Pull requests and feedback welcome!  
Twitter: [@DRTv1Official](https://twitter.com/DRTv1Official)

---

*DRTv1 – The world's first AI-governed contribution economy.*