// lib/meshRouterClient.js
import Web3 from "web3";

export default class MeshRouterClient {
  constructor({ web3, routerAddress, backendUrl }) {
    this.web3 = web3;
    this.routerAddress = routerAddress;
    this.backendUrl = backendUrl;
    this.routerAbi = [ /* insert MeshRouter ABI */ ];
  }

  async fetchOptimalRoute(tokenIn, tokenOut, amountIn) {
    const res = await fetch(`${this.backendUrl}/api/meshRoute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenIn, tokenOut, amountIn }),
    });
    return await res.json(); // returns { path, pools }
  }

  async approveToken(tokenAddress, spender, amount, from) {
    const tokenAbi = [
      { name: "approve", type: "function", inputs: [
        { name: "_spender", type: "address" },
        { name: "_value", type: "uint256" }
      ]}
    ];
    const token = new this.web3.eth.Contract(tokenAbi, tokenAddress);
    return await token.methods.approve(spender, amount).send({ from });
  }

  async executeSwap(tokenIn, tokenOut, amountIn, from) {
    const { path, pools } = await this.fetchOptimalRoute(tokenIn, tokenOut, amountIn);
    const amtWei = this.web3.utils.toWei(amountIn.toString(), "ether");
    const router = new this.web3.eth.Contract(this.routerAbi, this.routerAddress);
    return await router.methods.swap(tokenIn, tokenOut, amtWei, path, pools).send({ from });
  }
}
