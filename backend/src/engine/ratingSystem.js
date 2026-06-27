// ELO-based rating system for arena matches
// K-factor determines volatility: higher = faster rating changes

const DEFAULT_RATING = 1200;
const K_FACTOR = 32;
const PROVISIONAL_K = 64;
const PROVISIONAL_GAMES = 10;

function getRating(account) {
  return account.arena_rating || DEFAULT_RATING;
}

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function calculate(ratingA, ratingB, scoreA, gamesA, gamesB) {
  const kA = gamesA < PROVISIONAL_GAMES ? PROVISIONAL_K : K_FACTOR;
  const kB = gamesB < PROVISIONAL_GAMES ? PROVISIONAL_K : K_FACTOR;
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;
  const newA = Math.round(ratingA + kA * (scoreA - expectedA));
  const newB = Math.round(ratingB + kB * ((1 - scoreA) - expectedB));
  return { newRatingA: Math.max(100, newA), newRatingB: Math.max(100, newB), deltaA: newA - ratingA, deltaB: newB - ratingB };
}

function getRank(rating) {
  if (rating >= 2000) return 'S';
  if (rating >= 1800) return 'A';
  if (rating >= 1600) return 'B';
  if (rating >= 1400) return 'C';
  if (rating >= 1200) return 'D';
  return 'E';
}

function matchQuality(ratingA, ratingB) {
  const diff = Math.abs(ratingA - ratingB);
  if (diff <= 50) return 'perfect';
  if (diff <= 150) return 'good';
  if (diff <= 300) return 'fair';
  return 'poor';
}

module.exports = { calculate, getRank, matchQuality, getRating, expectedScore, DEFAULT_RATING };
