function createModel() {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [2], units: 24, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 24, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 3, activation: 'linear' }));
  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
  return model;
}
