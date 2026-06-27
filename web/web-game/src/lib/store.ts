interface CheckinRecord {
  timestamp: number; lat: number; lng: number; username: string;
}
interface Checkpoint { lat: number; lng: number; createdAt: number; }

// in-memory store — живёт пока работает сервер
export const store = {
  checkins: [] as CheckinRecord[],
  checkpoints: [] as Checkpoint[],
  hourly: [] as { hour: number; count: number }[],
  daily: [] as { date: string; count: number }[],
};

function seed() {
  const now = Date.now();
  for (let d = 6; d >= 0; d--) {
    const day = new Date(now - d * 86400000);
    const dateStr = day.toISOString().slice(0, 10);
    const count = Math.floor(Math.random() * 30) + 5;
    store.daily.push({ date: dateStr, count });
  }
  for (let h = 0; h < 24; h++) {
    store.hourly.push({ hour: h, count: Math.floor(Math.random() * 18) + 1 });
  }
  // начальные чекины
  for (let i = 0; i < 47; i++) {
    store.checkins.push({
      timestamp: now - Math.floor(Math.random() * 86400000),
      lat: 55.75 + (Math.random() - 0.5) * 0.05,
      lng: 37.62 + (Math.random() - 0.5) * 0.05,
      username: 'player_' + Math.floor(Math.random() * 1000),
    });
  }
}
seed();

export function addCheckin(username: string, lat: number, lng: number) {
  const ts = Date.now();
  store.checkins.push({ timestamp: ts, lat, lng, username });
  // обновляем почасовую статистику
  const hour = new Date(ts).getHours();
  const entry = store.hourly.find(h => h.hour === hour);
  if (entry) entry.count++;
  // обновляем дневную статистику
  const dateStr = new Date(ts).toISOString().slice(0, 10);
  const dayEntry = store.daily.find(d => d.date === dateStr);
  if (dayEntry) dayEntry.count++;
  else store.daily.push({ date: dateStr, count: 1 });
}

export function getAnalytics() {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;

  const checkinsToday = store.checkins.filter(c => new Date(c.timestamp).toISOString().slice(0, 10) === today).length;
  const checkinsWeek = store.checkins.filter(c => c.timestamp >= weekAgo).length;
  const checkinsMonth = store.checkins.filter(c => c.timestamp >= monthAgo).length;
  const totalVisitors = store.checkins.length;
  const uniquePlayers = new Set(store.checkins.map(c => c.username)).size;

  return {
    total_visitors: totalVisitors,
    unique_players: uniquePlayers,
    checkins_today: checkinsToday,
    checkins_week: checkinsWeek,
    checkins_month: checkinsMonth,
    hourly: store.hourly,
    daily: store.daily,
  };
}
