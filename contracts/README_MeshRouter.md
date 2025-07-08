
# MeshRouter v1.0

## 🔁 A Hyper-Efficient Uniswap V2 Multi-Hop Router for DeFi Mesh Architectures

The **MeshRouter** is a minimal, gas-optimized Solidity smart contract for executing multi-hop token swaps across Uniswap V2-compatible liquidity pools. It was designed for **Mesh-style liquidity ecosystems** and features robust security, modularity, and enhanced UX.

---

## ✅ Key Features

- **Multi-Hop Support**: Perform chained swaps across any number of Uniswap V2 pools.
- **ERC-20 Permit Integration**: Enables gasless approvals via `permit()` for supported tokens.
- **Per-Hop Slippage Protection**: Avoid MEV or volatile price shifts with min output thresholds per hop.
- **Gas Efficiency**: Avoids Uniswap Router overhead, reducing gas costs up to 30–50%.
- **Event Emission**: Swap logs support off-chain analytics and transparency.
- **No Hardcoded Tokens/Pools**: Universal and composable; paths and pools are passed at runtime.
- **Treasury + Dust Withdrawals**: Allows recovery of stuck tokens for operational use.

---

## 🚀 Usage

### `swapExactTokens(...)`

```solidity
function swapExactTokens(
    uint amountIn,
    uint[] calldata minAmountsOut,
    address[] calldata path,
    address[] calldata pools
) external
```

Requires:
- `approve()` of tokenIn to the router.
- Properly structured `path` and corresponding `pools`.

---

### `swapExactTokensWithPermit(...)`

```solidity
function swapExactTokensWithPermit(
    uint amountIn,
    uint[] calldata minAmountsOut,
    address[] calldata path,
    address[] calldata pools,
    uint deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external
```

Same as above, but leverages `permit()` for gasless approvals.

---

## 💸 Gas Benchmark (at 0.1 Gwei)

| Hops | Estimated Gas | USD Equivalent |
|------|----------------|----------------|
| 1    | ~220,000       | ~$0.07         |
| 5    | ~890,000       | ~$0.27         |
| 12   | ~2,771,908     | ~$0.83         |

*Source: Simulated Uniswap V2 deployments with MeshRouter logic.*

---

## 🔐 Admin Functions

### `withdrawDust(token: address)`
Withdraws all router-held balance of a specified token to the treasury address.

---

## 📦 Installation

Clone the repo:
```bash
git clone https://github.com/your-org/meshrouter.git
```

Compile with Hardhat:
```bash
npx hardhat compile
```

Deploy via:
```bash
npx hardhat run scripts/deploy.js --network mainnet
```

---

## 🌐 Integration

Can be called by:
- AI-based routers
- Web3 frontends
- Backend services optimizing Uniswap paths

Pair with `MeshPathfinder.js` for automatic multi-hop route discovery.

---

## 🧠 Suggested Improvements

- ✅ Add Uniswap V3 path encoding support
- ✅ Enable Curve, Balancer pool types
- 🛠 Upgradeable proxy support
- ⚡ Native ETH wrapping/unwrapping support
- 🌉 Cross-DEX bridging via MeshPathfinder.js

---

## 🔗 License

MIT — free for commercial and non-commercial use. Credit appreciated.
