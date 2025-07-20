// Simulated trading environment
class TradingEnvironment {
  constructor(startBalance = 1000) {
    this.balance = startBalance;
    this.stepCount = 0;
    this.tokenPrice = 1; // Simulated token (DRT) starts at $1
  }

  reset() {
    this.balance = 1000;
    this.tokenPrice = 1;
    this.stepCount = 0;
  }

  simulateTrade(action) {
    // Actions: 0 = hold, 1 = buy, 2 = sell
    const priceFluctuation = (Math.random() - 0.5) * 0.1; // ±5%
    this.tokenPrice += this.tokenPrice * priceFluctuation;

    if (action === 1 && this.balance > 0) {
      this.balance *= 1 + priceFluctuation; // simulate profit/loss
    } else if (action === 2 && this.balance > 0) {
      this.balance *= 1 - priceFluctuation; // simulate loss/profit on sell
    }

    this.stepCount++;
    return this.getState();
  }

  getState() {
    return [this.balance / 1000, this.tokenPrice]; // normalized
  }

  getReward() {
    return this.balance; // reward is profit
  }
}
