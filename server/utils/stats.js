// Utility functions for statistical calculations used by agents

export const linearRegressionSlope = (x, y) => {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
  const numerator = n * sumXY - sumX * sumY;
  const denominator = n * sumXX - sumX * sumX;
  return denominator === 0 ? 0 : numerator / denominator;
};

export const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

export const stdDev = (arr) => {
  const m = mean(arr);
  const variance = arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
};

export const coeffOfVariation = (arr) => {
  const m = mean(arr);
  return m === 0 ? 0 : stdDev(arr) / m;
};

export const variance = (arr) => {
  const m = mean(arr);
  return arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length;
};

export const percentageChange = (newVal, oldVal) => {
  if (oldVal === 0) return 0;
  return (newVal - oldVal) / Math.abs(oldVal);
};
