// Achievement definitions based on GridRunner Engine v1.0 spec
// Categories: Speed (A), Explorer (B), Weather (V), Audio (G), Sensor (D), Career (E), Arena (Zh), Hidden (Z), Hardcore (I), Milestones (Mil)

const ACHIEVEMENTS = [
  // ── A: Speed Overdrive ──
  { id: 'a001', category: 'speed', title: 'Первое ускорение', desc: 'Развить скорость выше 10 км/ч', icon: 'speed', condition: { type: 'max_speed', target: 10 }, reward: { xp: 150 } },
  { id: 'a002', category: 'speed', title: 'Городской стандарт', desc: 'Удерживать скорость 15 км/ч в течение 1 минуты', icon: 'speed', condition: { type: 'max_speed', target: 15 }, reward: { xp: 150 } },
  { id: 'a005', category: 'speed', title: 'На грани фола', desc: 'Превысить лимит скорости миссии на 15 км/ч и выжить', icon: 'speed', condition: { type: 'max_speed', target: 40 }, reward: { xp: 300 } },
  { id: 'a007', category: 'speed', title: 'Скейт-прорыв', desc: 'Набрать 20 км/ч на классическом скейтборде', icon: 'skateboard', condition: { type: 'max_speed', target: 20 }, reward: { xp: 200 } },
  { id: 'a009', category: 'speed', title: 'Электро-пуля', desc: 'Разогнаться выше 35 км/ч', icon: 'speed', condition: { type: 'max_speed', target: 35 }, reward: { xp: 250 } },
  { id: 'a014', category: 'speed', title: 'Спринтер', desc: 'Побить свой личный рекорд скорости', icon: 'trophy', condition: { type: 'max_speed', target: 25 }, reward: { xp: 200 } },

  // ── B: Grid Explorer ──
  { id: 'b001', category: 'explorer', title: 'Первый чекпоинт', desc: 'Успешно завершить первый чекпоинт', icon: 'flag', condition: { type: 'checkin_count', target: 1 }, reward: { xp: 150 } },
  { id: 'b003', category: 'explorer', title: 'Маршрут построен', desc: 'Завершить первую миссию', icon: 'route', condition: { type: 'trip_count', target: 1 }, reward: { xp: 150 } },
  { id: 'b006', category: 'explorer', title: 'В шарагу на колесах', desc: 'Проехать 2 км в утренний промежуток (07:30-09:00)', icon: 'sun', condition: { type: 'distance_total', target: 2 }, reward: { xp: 200 } },
  { id: 'b022', category: 'explorer', title: 'Локальный турист', desc: 'Совершить 5 поездок', icon: 'map', condition: { type: 'trip_count', target: 5 }, reward: { xp: 300 } },
  { id: 'b016', category: 'explorer', title: 'Районный курьер', desc: 'Проехать суммарно 5 км', icon: 'compass', condition: { type: 'distance_total', target: 5 }, reward: { xp: 250 } },
  { id: 'b017', category: 'explorer', title: 'Путешественник', desc: 'Проехать суммарно 10 км', icon: 'compass', condition: { type: 'distance_total', target: 10 }, reward: { xp: 400 } },
  { id: 'b023', category: 'explorer', title: 'Без остановки', desc: 'Проехать 1.5 км без паузы', icon: 'arrow', condition: { type: 'single_trip_distance', target: 1.5 }, reward: { xp: 250 } },
  { id: 'b028', category: 'explorer', title: 'Марафонец', desc: 'Проехать 5 км за одну поездку', icon: 'trophy', condition: { type: 'single_trip_distance', target: 5 }, reward: { xp: 500 } },

  // ── V: Weather & Environment ──
  { id: 'v031', category: 'weather', title: 'Промокшие кеды', desc: 'Завершить контракт в режиме погоды «Дождь»', icon: 'rain', condition: { type: 'weather_trip', weather: 'rain' }, reward: { xp: 200 } },
  { id: 'v032', category: 'weather', title: 'Асфальтовое марево', desc: 'Выполнить дневную миссию в жару', icon: 'sun', condition: { type: 'weather_trip', weather: 'hot' }, reward: { xp: 200 } },
  { id: 'v036', category: 'weather', title: 'Ночной бродяга', desc: 'Завершить контракт в промежутке 00:00-04:00', icon: 'moon', condition: { type: 'night_trip', target: 1 }, reward: { xp: 250 } },
  { id: 'v038', category: 'weather', title: 'Грозовой перевал', desc: 'Проехать под ливнем при грозе', icon: 'lightning', condition: { type: 'weather_trip', weather: 'thunderstorm' }, reward: { xp: 300 } },

  // ── G: Audio & Rhythm (simplified — based on trip milestones) ──
  { id: 'g041', category: 'audio', title: 'Включи бит', desc: 'Синхронизировать медиа с GridRunner', icon: 'music', condition: { type: 'trip_count', target: 3 }, reward: { xp: 150 } },
  { id: 'g047', category: 'audio', title: 'Хардкор-спринт', desc: 'Развить скорость >25 км/ч', icon: 'music', condition: { type: 'max_speed', target: 25 }, reward: { xp: 250 } },

  // ── E: Career & Contracts ──
  { id: 'e061', category: 'career', title: 'Первый заработок', desc: 'Получить первые монеты за контракт', icon: 'coin', condition: { type: 'trip_count', target: 1 }, reward: { xp: 100, gold: 50 } },
  { id: 'e064', category: 'career', title: 'Новичок в законе', desc: 'Достичь 5 уровня профиля', icon: 'level', condition: { type: 'level_reached', target: 5 }, reward: { xp: 500 } },
  { id: 'e065', category: 'career', title: 'Спец по доставке', desc: 'Выполнить 10 миссий', icon: 'briefcase', condition: { type: 'trip_count', target: 10 }, reward: { xp: 600 } },
  { id: 'e063', category: 'career', title: 'Работа на износ', desc: 'Завершить 5 контрактов подряд за один день', icon: 'fire', condition: { type: 'distance_day', target: 3 }, reward: { xp: 400 } },

  // ── Zh: Arena & Factions ──
  { id: 'zh071', category: 'arena', title: 'Рекрут', desc: 'Вступить в свой первый уличный клан', icon: 'users', condition: { type: 'trip_count', target: 1 }, reward: { xp: 150 } },
  { id: 'zh074', category: 'arena', title: 'Гео-инженер', desc: 'Принять участие в арена-режиме', icon: 'shield', condition: { type: 'arena_trip', target: 1 }, reward: { xp: 300 } },
  { id: 'zh077', category: 'arena', title: 'Одинокий рейдер', desc: '5 поездок в арена-режиме', icon: 'skull', condition: { type: 'arena_trip', target: 5 }, reward: { xp: 600 } },
  { id: 'zh075', category: 'arena', title: 'Сапер', desc: 'Пережить вражескую ловушку', icon: 'bomb', condition: { type: 'traps_survived', target: 1 }, reward: { xp: 200 } },

  // ── Z: Hidden & Fun ──
  { id: 'z081', category: 'hidden', title: 'Стояночный тормоз', desc: 'Запустить контракт и не двигаться 3 минуты', icon: 'pause', condition: { type: 'trip_count', target: 1 }, reward: { xp: 50 } },
  { id: 'z088', category: 'hidden', title: 'Энергетический вампир', desc: 'Проехать 50 км суммарно', icon: 'battery', condition: { type: 'distance_total', target: 50 }, reward: { xp: 1000 } },
  { id: 'z098', category: 'hidden', title: 'Марафонец на самокате', desc: 'Преодолеть 10 км за все время', icon: 'trophy', condition: { type: 'distance_total', target: 10 }, reward: { xp: 500 } },

  // ── I: Local Hardcore ──
  { id: 'i097', category: 'hardcore', title: 'Полный бак', desc: 'Проехать 20+ км за все время', icon: 'fuel', condition: { type: 'distance_total', target: 20 }, reward: { xp: 600 } },
  { id: 'i099', category: 'hardcore', title: 'Быстрее тени', desc: 'Разогнаться выше 50 км/ч', icon: 'bolt', condition: { type: 'max_speed', target: 50 }, reward: { xp: 800 } },

  // ── Vehicle-specific distance achievements ──
  { id: 'v_feet_10', category: 'vehicle', title: 'Пеший турист', desc: 'Пройти 5 км пешком', icon: 'walk', condition: { type: 'distance_vehicle', vehicle: 'feet', target: 5 }, reward: { xp: 300 } },
  { id: 'v_feet_50', category: 'vehicle', title: 'Железные ноги', desc: 'Пройти 50 км пешком', icon: 'walk', condition: { type: 'distance_vehicle', vehicle: 'feet', target: 50 }, reward: { xp: 1500 } },
  { id: 'v_skate_10', category: 'vehicle', title: 'Асфальтовая болезнь', desc: 'Накатать 10 км на скейте', icon: 'skateboard', condition: { type: 'distance_vehicle', vehicle: 'skateboard', target: 10 }, reward: { xp: 400 } },
  { id: 'v_skate_50', category: 'vehicle', title: 'Скейт-киллер', desc: 'Накатать 50 км на скейте', icon: 'skateboard', condition: { type: 'distance_vehicle', vehicle: 'skateboard', target: 50 }, reward: { xp: 2000 } },
  { id: 'v_bike_10', category: 'vehicle', title: 'Велопрогулка', desc: 'Накатать 10 км на велосипеде', icon: 'bicycle', condition: { type: 'distance_vehicle', vehicle: 'bicycle', target: 10 }, reward: { xp: 300 } },
  { id: 'v_bike_100', category: 'vehicle', title: 'Заслуженный байкер', desc: 'Накатать 100 км на велосипеде', icon: 'bicycle', condition: { type: 'distance_vehicle', vehicle: 'bicycle', target: 100 }, reward: { xp: 2500 } },
  { id: 'v_car_50', category: 'vehicle', title: 'Автомобилист', desc: 'Проехать 50 км на машине (VIP)', icon: 'car', condition: { type: 'distance_vehicle', vehicle: 'car', target: 50 }, reward: { xp: 1000 } },
  { id: 'v_car_200', category: 'vehicle', title: 'Дальнобойщик', desc: 'Проехать 200 км на машине (VIP)', icon: 'car', condition: { type: 'distance_vehicle', vehicle: 'car', target: 200 }, reward: { xp: 5000 } },
  { id: 'v_hovercar_50', category: 'vehicle', title: 'Кибер-райдер', desc: 'Проехать 50 км на ховеркаре (VIP)', icon: 'rocket', condition: { type: 'distance_vehicle', vehicle: 'hovercar', target: 50 }, reward: { xp: 1500 } },

  // ── Milestones (Career Milestones from spec Part 3) ──
  { id: 'mil_02', category: 'milestone', title: 'Дальнобойщик', desc: 'Проехать суммарно 500 км', icon: 'truck', condition: { type: 'distance_total', target: 500 }, reward: { xp: 2500 } },
  { id: 'mil_03', category: 'milestone', title: 'Железные ноги', desc: 'Накатать 200 км мускульной тягой', icon: 'legs', condition: { type: 'distance_total', target: 200 }, reward: { xp: 2500 } },
  { id: 'mil_04', category: 'milestone', title: 'Заслуженный байкер', desc: 'Накатать 300 км на велосипеде', icon: 'bike', condition: { type: 'distance_vehicle', vehicle: 'bicycle', target: 300 }, reward: { xp: 2500 } },
  { id: 'mil_06', category: 'milestone', title: 'Властелин колец', desc: 'Завершить 150 контрактов', icon: 'crown', condition: { type: 'trip_count', target: 150 }, reward: { xp: 2500 } },
  { id: 'mil_10', category: 'milestone', title: 'Олигарх Грида', desc: 'Заработать 500 000 монет', icon: 'gold', condition: { type: 'trip_count', target: 100 }, reward: { xp: 2500 } },
  { id: 'mil_12', category: 'milestone', title: 'Меломан-экстремал', desc: 'Проехать 100 км под музыку', icon: 'music', condition: { type: 'distance_total', target: 100 }, reward: { xp: 2500 } },
  { id: 'mil_14', category: 'milestone', title: 'Ночной кошмар', desc: 'Выполнить 10 ночных контрактов', icon: 'moon', condition: { type: 'night_trip', target: 10 }, reward: { xp: 2500 } },
  { id: 'mil_22', category: 'milestone', title: 'Без единой царапины', desc: 'Пройти 20 контрактов без потери HP', icon: 'shield', condition: { type: 'trip_count', target: 20 }, reward: { xp: 2500 } },
  { id: 'mil_28', category: 'milestone', title: 'Пожиратель миль', desc: 'Проехать 40 км за один день', icon: 'bolt', condition: { type: 'distance_day', target: 40 }, reward: { xp: 2500 } },
  { id: 'mil_01', category: 'milestone', title: 'Король улиц', desc: 'Достичь 50-го уровня', icon: 'crown', condition: { type: 'level_reached', target: 50 }, reward: { xp: 5000 } },
];

module.exports = ACHIEVEMENTS;
