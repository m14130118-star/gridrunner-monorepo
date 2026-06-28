import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const locales: Record<string, any> = {
  ru: {
    "nav": {"home": "Главная", "profile": "Профиль", "arena": "Арена", "admin": "B2B", "login": "Войти", "logout": "Выйти", "register": "Регистрация", "news": "Новости", "garage": "Гараж", "trips": "Трипы", "settings": "Настройки", "leaderboard": "Лидерборд"},
    "landing": {"title": "GridRunner", "subtitle": "Преврати прогулку в приключение", "desc": "Исследуй город, собирай награды, соревнуйся с друзьями", "download": "Скачать", "get_started": "Начать", "learn": "Узнать больше", "modes": "Режимы", "vip": "VIP подписка", "vip_desc": "Безлимитные трипы, авторежим, золотые ачивки", "vip_cta": "Оформить VIP", "ios": "App Store", "android": "Google Play", "about_title": "Как это было сделано", "about_desc": "GridRunner — пет-проект, который делал один человек. От идеи до продакшна: карты, алгоритмы маршрутов, музыка, геймификация и B2B-панель. Весь код — с нуля, без шаблонов.", "about_footer": "Разработано за несколько месяцев соло."},
    "modes": {"walk": {"name": "Пешком", "speed": "≤12 км/ч", "desc": "Размеренный темп, наслаждайся видами и открывай новые уголки"}, "skate": {"name": "Скейтборд", "speed": "≤25 км/ч", "desc": "Драйв и адреналин — для тех, кто не стоит на месте"}, "bike": {"name": "Велосипед", "speed": "≤45 км/ч", "desc": "Скорость и выносливость, идеально для больших расстояний"}, "car": {"name": "Автомобиль", "speed": "≤160 км/ч", "desc": "Выходные за город — исследуй дальние локации"}},
    "features": {"scenic": {"title": "Красивые маршруты", "desc": "AI подбирает живописные пути"}, "music": {"title": "Музыка под настроение", "desc": "Плейлисты под твой стиль"}, "checkin": {"title": "Чекины и награды", "desc": "Получай XP и золото"}, "leaderboard": {"title": "Лидерборды", "desc": "Соревнуйся за территории"}},
    "auth": {"login_title": "Войти", "register_title": "Регистрация", "email": "Email", "password": "Пароль", "username": "Имя", "preferences": "Что тебе нравится?", "pref_desc": "Выбери свои интересы — мы будем подбирать маршруты под них", "prefs": {"embankment": "Набережные", "sunset": "Закаты", "bakery": "Булочки", "coffee": "Кофе", "park": "Парки", "history": "История", "shopping": "Магазины", "nature": "Природа", "food": "Еда"}, "start": "Начать приключение", "demo_hint": "Любой email + пароль от 3 символов"},
    "trip": {"new": "Новый трип", "start": "Старт", "finish": "Завершить", "how_long": "Сколько по времени?", "places": "Куда хочешь зайти?", "music": "Музыка под маршрут", "route_ready": "Маршрут готов!", "min": "мин", "km": "км", "kmh": "км/ч", "duration_options": {"30": "30 мин", "60": "1 час", "90": "1.5 часа", "120": "2 часа", "180": "3 часа"}, "genres": {"chill": "Чилл", "electronic": "Электроника", "rock": "Рок", "jazz": "Джаз", "pop": "Поп", "hiphop": "Хип-хоп"}, "distance": "Дистанция", "time": "Время", "speed": "Скорость", "checkpoints": "Точки", "completed": "Трип завершён!", "checkpoint_reached": "Чекпоинт достигнут!", "checkpoints_visited": "чекпоинтов посещено", "select_places": "Выбери места для маршрута", "build_route": "Построить маршрут", "places_selected": "выбрано", "xp_per_cp": "XP за чекпоинт"},
    "garage": {
      "title": "Гараж", "level": "Уровень", "xp": "Опыт", "achievements": "Достижения",
      "first_ride": "Первая поездка", "km_traveled": "км пройдено", "next_ach": "Следующая ачивка...",
      "swipe": "Листать", "stats": "Статы", "hide": "Скрыть", "vip_only": "VIP",
      "loading": "Загрузка гаража...", "no_vehicles": "Нет транспорта"
    },
    "settings": {
      "title": "Настройки", "theme": "Тема", "system": "Системная", "dark": "Тёмная", "light": "Светлая",
      "volume": "Громкость", "language": "Язык", "account": "Аккаунт", "username": "Имя",
      "delete": "Удалить", "delete_confirm": "Точно удалить аккаунт? Это действие нельзя отменить.",
      "saved": "Сохранено", "mode_switch": "Режим", "chill": "Чилл", "arena": "Арена",
      "avatar": "Аватар", "avatar_hint": "Нажми, чтобы загрузить фото"
    },
    "trips": {
      "title": "История поездок", "no_trips": "Пока нет поездок", "back": "Назад",
      "speed": "Скорость", "progress": "Прогресс", "mode": "Режим",
      "arena": "Арена", "chill": "Чилл", "replay": "Повтор"
    },
    "admin": {"title": "B2B панель", "desc": "Управление точками и аналитика", "today": "Чекинов сегодня", "week": "За неделю", "month": "За месяц", "visitors": "Всего посетителей", "unique": "Уникальных игроков", "hourly": "По часам", "daily": "По дням", "new_point": "Новая точка", "save": "Сохранить", "saved": "Сохранено", "refresh": "Обновить", "maps_ru": "Яндекс.Карты", "maps_en": "Google Maps"},
    "common": {"loading": "Загрузка...", "error": "Ошибка", "success": "Успешно", "close": "Закрыть", "next": "Далее", "back": "Назад"},
    "onboarding": {
      "welcome_title": "Добро пожаловать в GridRunner!",
      "welcome_desc": "Преврати прогулку в приключение. Выбери свой вайб — и мы подберём маршруты под твои интересы.",
      "choose_vibe": "Выбрать вайб",
      "garage_title": "Гараж: выбери транспорт",
      "garage_desc": "Пешком, на скейте, велосипеде или машине — каждый режим даёт разные ощущения и скорость.",
      "open_garage": "Открыть гараж",
      "trip_title": "Первый трип",
      "trip_desc": "Нажми «Новый трип», выбери маршрут и отправляйся исследовать город. Жми старт!",
      "start_trip": "Начать трип",
      "profile_title": "Исследуй и прокачивайся",
      "profile_desc": "Следи за прогрессом, открывай ачивки, собирай XP и золото. Каждый трип — шаг к новому уровню.",
      "view_profile": "Мой профиль",
      "leaderboard_title": "Вступай в сообщество",
      "leaderboard_desc": "Соревнуйся с другими игроками, захватывай территории и поднимайся в топ лидерборда.",
      "join_community": "Лидерборд",
      "lets_go": "Погнали!"
    }
  },
  en: {
    "nav": {"home": "Home", "profile": "Profile", "arena": "Arena", "admin": "B2B", "login": "Sign In", "logout": "Sign Out", "register": "Register", "news": "News", "garage": "Garage", "trips": "Trips", "settings": "Settings", "leaderboard": "Leaderboard"},
    "landing": {"title": "GridRunner", "subtitle": "Turn your walk into an adventure", "desc": "Explore the city, earn rewards, compete with friends", "download": "Download APK", "get_started": "Get Started", "learn": "Learn More", "modes": "Modes", "vip": "VIP Subscription", "vip_desc": "Unlimited trips, car mode, golden achievements", "vip_cta": "Get VIP", "ios": "App Store", "android": "Google Play", "about_title": "How it was built", "about_desc": "GridRunner is a solo pet project — from idea to production: maps, route algorithms, music, gamification, and a B2B panel. All code written from scratch, no templates.", "about_footer": "Built over a few months, solo."},
    "modes": {"walk": {"name": "Walk", "speed": "≤12 km/h", "desc": "A relaxed pace — enjoy the views and discover new spots"}, "skate": {"name": "Skateboard", "speed": "≤25 km/h", "desc": "Drive and adrenaline for those who never stand still"}, "bike": {"name": "Bicycle", "speed": "≤45 km/h", "desc": "Speed and endurance — perfect for long distances"}, "car": {"name": "Car", "speed": "≤160 km/h", "desc": "Weekend road trips — explore far-off locations"}},
    "features": {"scenic": {"title": "Scenic Routes", "desc": "AI picks picturesque paths"}, "music": {"title": "Mood Music", "desc": "Playlists for your style"}, "checkin": {"title": "Check-ins & Rewards", "desc": "Earn XP and gold"}, "leaderboard": {"title": "Leaderboards", "desc": "Compete for territories"}},
    "auth": {"login_title": "Sign In", "register_title": "Register", "email": "Email", "password": "Password", "username": "Username", "preferences": "What do you like?", "pref_desc": "Pick your interests — we'll build routes around them", "prefs": {"embankment": "Embankments", "sunset": "Sunsets", "bakery": "Bakeries", "coffee": "Coffee", "park": "Parks", "history": "History", "shopping": "Shopping", "nature": "Nature", "food": "Food"}, "start": "Start adventure", "demo_hint": "Any email + password (3+ chars)"},
    "trip": {"new": "New Trip", "start": "Start", "finish": "Finish", "how_long": "How long?", "places": "Where to stop?", "music": "Route playlist", "route_ready": "Route is ready!", "min": "min", "km": "km", "kmh": "km/h", "duration_options": {"30": "30 min", "60": "1 hour", "90": "1.5 hours", "120": "2 hours", "180": "3 hours"}, "genres": {"chill": "Chill", "electronic": "Electronic", "rock": "Rock", "jazz": "Jazz", "pop": "Pop", "hiphop": "Hip-Hop"}, "distance": "Distance", "time": "Time", "speed": "Speed", "checkpoints": "Stops", "completed": "Trip completed!", "checkpoint_reached": "Checkpoint reached!", "checkpoints_visited": "of checkpoints visited", "select_places": "Select places for your route", "build_route": "Build Route", "places_selected": "selected", "xp_per_cp": "XP per checkpoint"},
    "garage": {
      "title": "Garage", "level": "Level", "xp": "XP", "achievements": "Achievements",
      "first_ride": "First ride", "km_traveled": "km traveled", "next_ach": "Next achievement...",
      "swipe": "Swipe", "stats": "Stats", "hide": "Hide", "vip_only": "VIP",
      "loading": "Loading garage...", "no_vehicles": "No vehicles"
    },
    "settings": {
      "title": "Settings", "theme": "Theme", "system": "System", "dark": "Dark", "light": "Light",
      "volume": "Volume", "language": "Language", "account": "Account", "username": "Username",
      "delete": "Delete", "delete_confirm": "Delete account? This cannot be undone.",
      "saved": "Saved", "mode_switch": "Mode", "chill": "Chill", "arena": "Arena",
      "avatar": "Avatar", "avatar_hint": "Tap to upload a photo"
    },
    "trips": {
      "title": "Trip History", "no_trips": "No trips yet", "back": "Back",
      "speed": "Speed", "progress": "Progress", "mode": "Mode",
      "arena": "Arena", "chill": "Chill", "replay": "Replay"
    },
    "admin": {"title": "B2B Panel", "desc": "Point management & analytics", "today": "Check-ins Today", "week": "This Week", "month": "This Month", "visitors": "Total Visitors", "unique": "Unique Players", "hourly": "By Hour", "daily": "By Day", "new_point": "New Point", "save": "Save", "saved": "Saved", "refresh": "Refresh", "maps_ru": "Yandex Maps", "maps_en": "Google Maps"},
    "common": {"loading": "Loading...", "error": "Error", "success": "Success", "close": "Close", "next": "Next", "back": "Back"},
    "onboarding": {
      "welcome_title": "Welcome to GridRunner!",
      "welcome_desc": "Turn your walk into an adventure. Pick your vibe — we'll build routes around your interests.",
      "choose_vibe": "Choose your vibe",
      "garage_title": "Garage: pick your ride",
      "garage_desc": "Walk, skate, bike, or drive — each mode feels different and has its own speed.",
      "open_garage": "Open garage",
      "trip_title": "Start your first trip",
      "trip_desc": "Tap 'New Trip', pick a route, and head out to explore the city. Hit start!",
      "start_trip": "Start a trip",
      "profile_title": "Explore & level up",
      "profile_desc": "Track your progress, earn achievements, collect XP and gold. Every trip levels you up.",
      "view_profile": "My profile",
      "leaderboard_title": "Join the community",
      "leaderboard_desc": "Compete with other players, capture territories, and climb the leaderboard.",
      "join_community": "Leaderboard",
      "lets_go": "Let's go!"
    }
  }
};

function get(obj: Record<string, any>, path: string): string {
  const keys = path.split('.');
  let val: any = obj;
  for (const k of keys) { if (val == null) return path; val = val[k]; }
  return typeof val === 'string' ? val : path;
}

interface I18nCtx {
  lang: 'ru' | 'en';
  setLang: (l: 'ru' | 'en') => void;
  t: (path: string) => string;
  locale: Record<string, any>;
}

const CTX = createContext<I18nCtx>({ lang: 'ru', setLang: () => {}, t: (s: string) => s, locale: {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [locale, setLocale] = useState<Record<string, any>>(locales.ru);

  useEffect(() => {
    const saved = localStorage.getItem('gridrunner_lang');
    if (saved === 'en' || saved === 'ru') {
      setLang(saved);
      setLocale(locales[saved]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gridrunner_lang', lang);
    setLocale(locales[lang]);
  }, [lang]);

  const t = (path: string) => get(locale, path);

  return <CTX.Provider value={{ lang, setLang, t, locale }}>{children}</CTX.Provider>;
}

export const useT = () => useContext(CTX);
