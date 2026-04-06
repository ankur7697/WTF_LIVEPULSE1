function createRng(seed = 42) {
  let state = seed % 2147483647;

  if (state <= 0) {
    state += 2147483646;
  }

  return function nextRandom() {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

function pickWeighted(items, weights, rng) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = rng() * total;

  for (let index = 0; index < items.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) {
      return items[index];
    }
  }

  return items[items.length - 1];
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffle(list, rng) {
  const copy = [...list];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

module.exports = {
  createRng,
  pick,
  pickWeighted,
  randomInt,
  shuffle,
};

