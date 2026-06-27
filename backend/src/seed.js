const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function write(collection, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${collection}.json`), JSON.stringify(data, null, 2));
}

// Vehicles
write('vehicles', [
  { id: 1, name: 'Ноги', type: 'feet', speed_limit_kmh: 12, resource_type: 'hp', resource_consumption_per_km: 0.1, icon: '🦶' },
  { id: 2, name: 'Скейтборд', type: 'skateboard', speed_limit_kmh: 25, resource_type: 'hp', resource_consumption_per_km: 0.2, icon: '🛹' },
  { id: 3, name: 'Велосипед', type: 'bicycle', speed_limit_kmh: 45, resource_type: 'fuel', resource_consumption_per_km: 0.3, icon: '🚲' },
  { id: 4, name: 'Машина', type: 'car', speed_limit_kmh: 160, resource_type: 'fuel', resource_consumption_per_km: 0.5, icon: '🚗', vip_only: true },
]);

// Sample POIs (Moscow area)
write('pois', [
  { id: 1, osm_id: 'osm_1', name: 'Surf Coffee', lat: 55.7562, lng: 37.6185, category: 'food', tags: { amenity: 'cafe' }, is_active: true, restore_hp: 35, check_in_radius: 30, gold_reward: 50, xp_reward: 25 },
  { id: 2, osm_id: 'osm_2', name: 'Парк Горького', lat: 55.7312, lng: 37.6043, category: 'park', tags: { leisure: 'park' }, is_active: true, restore_hp: 20, check_in_radius: 50, gold_reward: 30, xp_reward: 15 },
  { id: 3, osm_id: 'osm_3', name: 'Шоколадница', lat: 55.7612, lng: 37.6321, category: 'food', tags: { amenity: 'cafe' }, is_active: true, restore_hp: 35, check_in_radius: 30, gold_reward: 50, xp_reward: 25 },
  { id: 4, osm_id: 'osm_4', name: 'Кинотеатр Художественный', lat: 55.7587, lng: 37.6105, category: 'culture', tags: { amenity: 'cinema' }, is_active: true, restore_hp: 15, check_in_radius: 30, gold_reward: 40, xp_reward: 20 },
  { id: 5, osm_id: 'osm_5', name: 'Воробьёвы горы', lat: 55.7181, lng: 37.5434, category: 'park', tags: { leisure: 'park' }, is_active: true, restore_hp: 30, check_in_radius: 50, gold_reward: 35, xp_reward: 20 },
]);

// Districts
write('districts', [
  { id: 1, name: 'Арбат', lat: 55.7520, lng: 37.5980, radius_km: 0.5, clan_id: null, capture_points: 0, created_at: new Date().toISOString() },
  { id: 2, name: 'Патриаршие', lat: 55.7640, lng: 37.5920, radius_km: 0.4, clan_id: null, capture_points: 0, created_at: new Date().toISOString() },
  { id: 3, name: 'Китай-город', lat: 55.7560, lng: 37.6340, radius_km: 0.6, clan_id: null, capture_points: 0, created_at: new Date().toISOString() },
]);

// Achievement definitions
write('achievement_defs', [
  { id: 'ach_asphalt', title: 'Асфальтовая болезнь', desc: 'Накатать 50 км на скейте', icon: 'skate', condition: { type: 'distance', vehicle: 'skateboard', target: 50 }, reward: { type: 'texture', id: 'skate_worn' } },
  { id: 'ach_coffee', title: 'Кофеиновый овердоз', desc: 'Чекины в 30 уникальных POI (food)', icon: 'coffee', condition: { type: 'checkins', category: 'food', target: 30 }, reward: { type: 'modifier', hp_bonus: 5, fuel_bonus: 5 } },
  { id: 'ach_midnight', title: 'Король Полуночи', desc: 'Трип 5+ км между 00:00-04:00', icon: 'moon', condition: { type: 'night_trip', min_km: 5 }, reward: { type: 'cosmetic', id: 'neon_underglow' } },
  { id: 'ach_ghost', title: 'Призрачный Гонщик', desc: '200 км на машине в ночном режиме (VIP)', icon: 'car', condition: { type: 'distance', vehicle: 'car', target: 200, vip: true }, reward: { type: 'cosmetic', id: 'ghost_skin' } },
  { id: 'ach_partisan', title: 'Партизан ИРЛ', desc: 'Пережить 15 вражеских ловушек на Арене', icon: 'skull', condition: { type: 'traps_survived', target: 15 }, reward: { type: 'badge', id: 'sapper' } },
  { id: 'ach_district', title: 'Гроза Района', desc: 'Участвовать в 10 захватах районов', icon: 'flag', condition: { type: 'captures', target: 10 }, reward: { type: 'badge', id: 'storm' } },
]);

console.log('Seed data written to', DATA_DIR);
