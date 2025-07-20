let env = new TradingEnvironment();
let model = createModel();
let mode = "simulation";
let epsilon = 1.0;
let decay = 0.995;
let minEpsilon = 0.01;
let memory = [];

function toggleMode() {
  mode = (mode === "simulation") ? "live" : "simulation";
  document.getElementById('mode').innerText = mode.charAt(0).toUpperCase() + mode.slice(1);
}

async function trainBot() {
  let step = 0;

  while (true) {
    const state = tf.tensor([env.getState()]);
    let action;
    if (Math.random() < epsilon) {
      action = Math.floor(Math.random() * 3); // explore
    } else {
      const prediction = model.predict(state);
      action = prediction.argMax(1).dataSync()[0]; // exploit
    }

    const prevBalance = env.balance;
    const newState = env.simulateTrade(action);
    const reward = env.getReward() - prevBalance;

    memory.push({ state: env.getState(), action, reward, nextState: newState });
    if (memory.length > 200) memory.shift();

    if (memory.length > 50) await trainStep();

    document.getElementById("balance").innerText = env.balance.toFixed(2);
    document.getElementById("step").innerText = step++;
    document.getElementById("log").innerText = `Step ${step} | Action: ${["Hold","Buy","Sell"][action]} | Balance: $${env.balance.toFixed(2)}\n` + document.getElementById("log").innerText;

    epsilon = Math.max(minEpsilon, epsilon * decay);

    await new Promise(resolve => setTimeout(resolve, 200)); // delay
  }
}

async function trainStep() {
  const batch = tf.util.shuffle(memory).slice(0, 32);
  const states = batch.map(d => d.state);
  const nextStates = batch.map(d => d.nextState);

  const statesTensor = tf.tensor(states);
  const nextStatesTensor = tf.tensor(nextStates);
  const qNext = model.predict(nextStatesTensor);
  const qNextMax = qNext.max(1).arraySync();

  const qTargets = model.predict(statesTensor).arraySync();

  batch.forEach((data, i) => {
    qTargets[i][data.action] = data.reward + 0.95 * qNextMax[i];
  });

  await model.fit(statesTensor, tf.tensor(qTargets), { epochs: 1, verbose: 0 });
}

window.onload = trainBot;
