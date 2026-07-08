import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const locales: Record<string, any> = {
  ru: {
    nav: { features: 'Возможности', pricing: 'Тарифы', login: 'Войти', register: 'Регистрация', how: 'Как играть', gangs: 'Банды', faq: 'FAQ', download: 'Скачать', play: 'Играть' },
    hero: {
      badge: 'GPS-игра нового поколения',
      title: 'Твой город — твоя арена',
      desc: 'GridRunner превращает реальные улицы в поле боя. Ходи, катайся, захватывай районы для своей банды, ставь ловушки врагам и становись легендой города.',
      cta: 'Играть в браузере',
      cta2: 'Скачать APK',
      learn: 'Узнать больше', android: 'Скачать APK', ios: 'App Store',
      scroll: 'листай вниз',
    },
    ticker: ['ЗАХВАТ ЗОН', 'GPS-ТРЕКИНГ', 'ELO РЕЙТИНГ', 'БАНДЫ', '3D ГАРАЖ', 'ЛОВУШКИ', 'ТРЕЙДЫ', 'ЕЖЕДНЕВНЫЕ КВЕСТЫ', 'VIP', 'РЕАЛЬНЫЕ УЛИЦЫ'],
    stats: { zones: 'зон на карте', pois: 'точек интереса', vehicles: 'вида транспорта', title_live: 'LIVE' },
    how: {
      title: 'Как это работает',
      subtitle: 'Три шага от новичка до короля района',
      s1: 'Выбери маршрут', s1_desc: 'Задай время, транспорт и вайб — алгоритм построит трип по реальным улицам через кафе, парки и секретные точки города.',
      s2: 'Двигайся по городу', s2_desc: 'GPS отслеживает каждый метр. Чекинься в точках, зарабатывай XP и золото, следи за HP и топливом.',
      s3: 'Захватывай районы', s3_desc: 'Входи в зону — влияние твоей банды растёт. Ставь мины, используй щиты и бустеры, отбивай территории врагов.',
    },
    features: {
      title: 'Целый город в твоём кармане', subtitle: 'Это не просто шагомер. Это войнушка по-взрослому.',
      gps: 'Живые GPS-квесты', gps_desc: 'Маршруты строятся по реальным улицам через OSM: кафе, парки, смотровые. Каждый трип уникален.',
      clans: 'Банды и территории', clans_desc: 'Создай банду, назначь штаб, раздай роли. Карта города делится между группировками в реальном времени.',
      garage: '3D Гараж', garage_desc: 'Пешком, скейт, велик, тачка — у каждого транспорта своя скорость, расход и стиль. Гараж отрисован в 3D.',
      arena: 'Арена и ELO', arena_desc: 'Рейтинговая система как в шахматах: захватил чужую зону — забрал ELO. Матчмейкинг подберёт соперников твоего уровня.',
      items: 'Ловушки и предметы', items_desc: 'Мины на своей земле, щиты, аптечки, сканеры и бустеры влияния. P2P-трейд с другими игроками в Safe Zone.',
      music: 'Саундтрек поездки', music_desc: 'Динамический плейлист под транспорт, вайб и погоду. Город звучит по-разному каждый вечер.',
    },
    gangs: {
      title: 'Собери свою банду',
      subtitle: 'В одиночку ты просто гуляешь. С бандой — контролируешь районы.',
      join: 'Вступи в банду',
      join_desc: 'Найди команду: захватывайте зоны вместе, обменивайтесь предметами и защищайте общую территорию.',
      join_f1: 'Общие территории банды на карте',
      join_f2: 'Роли: новичок → офицер → главарь',
      join_f3: 'Штаб с ускоренным регеном HP',
      create: 'Или создай свою',
      create_desc: 'Своё название, свой цвет на карте, свой штаб. Ты главарь — набирай людей и раздавай роли.',
      form_name: 'Название банды',
      form_color: 'Цвет на карте',
      form_btn: 'Создать банду',
    },
    pricing: {
      title: 'Выбери свой путь', subtitle: 'Стартуй бесплатно. VIP — для тех, кто играет всерьёз.',
      free: 'Уличный', free_price: '0₽', free_period: 'навсегда', free_features: ['Пешком, скейт, велосипед', 'Захват зон и банды', 'Ежедневные квесты', 'Базовые достижения'], free_cta: 'Начать бесплатно',
      vip: 'VIP', vip_price: '199₽', vip_period: '/мес', vip_features: ['Всё из Уличного', 'Автомобиль и эксклюзивный транспорт', 'Ежедневный бонус 200 монет + предмет', 'Золотые достижения', 'Приоритет в матчмейкинге'], vip_cta: 'Стать VIP',
      biz: 'Бизнес', biz_price: '999₽', biz_period: '/мес', biz_features: ['Свои чекпоинты на карте', 'Поток игроков в твою точку', 'Аналитика посещений', 'API и поддержка'], biz_cta: 'Подключить точку',
      popular: 'Популярное', yearly_hint: 'или 1490₽/год — выгода 58%',
    },
    download: {
      title: 'Начни прямо сейчас',
      subtitle: 'Браузер, Android, iPhone — один аккаунт везде.',
      web: 'Играть в браузере', web_desc: 'Без установки, сразу в бой',
      apk: 'Скачать APK', apk_desc: 'Android, 52 МБ',
      ios: 'iPhone / iPad', ios_desc: 'Установка через Safari',
      ios_s1: 'Открой игру в Safari',
      ios_s2: 'Нажми «Поделиться»',
      ios_s3: 'Выбери «На экран "Домой"»',
      ios_btn: 'Открыть в Safari',
    },
    faq: {
      title: 'Вопросы',
      q1: 'Мне правда нужно выходить на улицу?', a1: 'Да, в этом вся суть. GridRunner использует настоящий GPS — зоны захватываются ногами, колёсами и педалями. Диван не прокачает твой ELO.',
      q2: 'Это бесплатно?', a2: 'Полностью. Ядро игры — трипы, банды, захват зон, арена — бесплатно навсегда. VIP даёт бонусы и эксклюзивный транспорт, но не покупает победу.',
      q3: 'Как работает захват района?', a3: 'Заходишь в зону — влияние твоей банды растёт с каждым шагом. Когда оно превышает влияние владельца, зона меняет цвет. Погибнешь от мины — банда потеряет 10% территорий.',
      q4: 'Что за ELO-рейтинг?', a4: 'Как в шахматах: отбил зону у игрока — забрал у него очки рейтинга. Матчмейкинг подбирает соперников в пределах ±200 ELO, чтобы драка была честной.',
      q5: 'Работает в моём городе?', a5: 'Да. Маршруты строятся по OpenStreetMap — игра работает в любом городе мира, от Москвы до деревни, где есть хотя бы две улицы.',
    },
    cta: { title: 'Город не захватит себя сам', desc: 'Пока ты читаешь это, чья-то банда красит твой район в свой цвет.', btn: 'В игру' },
    auth: { create: 'Создай аккаунт — он будет работать и на сайте, и в игре', login_desc: 'Войди в аккаунт для игры и сайта', no_account: 'Нет аккаунта?', has_account: 'Уже есть аккаунт?', register: 'Регистрация', login: 'Войти', password_short: 'Пароль слишком короткий', fill: 'Заполните все поля' },
    footer: { rights: 'Все права защищены.', tagline: 'Сделано на улицах.' },
  },
  en: {
    nav: { features: 'Features', pricing: 'Pricing', login: 'Sign In', register: 'Register', how: 'How to play', gangs: 'Gangs', faq: 'FAQ', download: 'Download', play: 'Play' },
    hero: {
      badge: 'Next-gen GPS game',
      title: 'Your city is your arena',
      desc: 'GridRunner turns real streets into a battlefield. Walk, ride, capture districts for your gang, set traps for enemies and become a city legend.',
      cta: 'Play in browser',
      cta2: 'Download APK',
      learn: 'Learn More', android: 'Download APK', ios: 'App Store',
      scroll: 'scroll down',
    },
    ticker: ['ZONE CAPTURE', 'GPS TRACKING', 'ELO RATING', 'GANGS', '3D GARAGE', 'TRAPS', 'TRADING', 'DAILY QUESTS', 'VIP', 'REAL STREETS'],
    stats: { zones: 'zones on the map', pois: 'points of interest', vehicles: 'vehicle types', title_live: 'LIVE' },
    how: {
      title: 'How it works',
      subtitle: 'Three steps from rookie to district king',
      s1: 'Pick a route', s1_desc: 'Set time, vehicle and vibe — the algorithm builds a trip through real streets: cafes, parks and secret city spots.',
      s2: 'Move through the city', s2_desc: 'GPS tracks every meter. Check in at points, earn XP and gold, watch your HP and fuel.',
      s3: 'Capture districts', s3_desc: 'Enter a zone — your gang influence grows. Place mines, use shields and boosters, take back enemy turf.',
    },
    features: {
      title: 'A whole city in your pocket', subtitle: 'Not a step counter. A proper turf war.',
      gps: 'Living GPS quests', gps_desc: 'Routes are built on real streets via OSM: cafes, parks, viewpoints. Every trip is unique.',
      clans: 'Gangs & territories', clans_desc: 'Create a gang, set an HQ, assign roles. The city map is split between crews in real time.',
      garage: '3D Garage', garage_desc: 'Feet, skateboard, bike, car — each vehicle has its own speed, consumption and style. Rendered in 3D.',
      arena: 'Arena & ELO', arena_desc: 'Chess-style rating: capture someone\'s zone — take their ELO. Matchmaking finds opponents at your level.',
      items: 'Traps & items', items_desc: 'Mines on your turf, shields, medpacks, scanners and boosters. P2P trading in Safe Zones.',
      music: 'Trip soundtrack', music_desc: 'Dynamic playlist matching your vehicle, vibe and weather. The city sounds different every night.',
    },
    gangs: {
      title: 'Build your gang',
      subtitle: 'Alone you\'re just taking a walk. With a gang — you control districts.',
      join: 'Join a gang',
      join_desc: 'Find a crew: capture zones together, trade items and defend shared territory.',
      join_f1: 'Shared gang territories on the map',
      join_f2: 'Roles: rookie → officer → boss',
      join_f3: 'HQ with boosted HP regen',
      create: 'Or create your own',
      create_desc: 'Your name, your color on the map, your HQ. You\'re the boss — recruit people and assign roles.',
      form_name: 'Gang name',
      form_color: 'Map color',
      form_btn: 'Create gang',
    },
    pricing: {
      title: 'Choose your path', subtitle: 'Start free. VIP is for those who play for keeps.',
      free: 'Street', free_price: '$0', free_period: 'forever', free_features: ['Feet, skateboard, bicycle', 'Zone capture & gangs', 'Daily quests', 'Basic achievements'], free_cta: 'Start free',
      vip: 'VIP', vip_price: '$1.99', vip_period: '/mo', vip_features: ['Everything in Street', 'Car & exclusive vehicles', 'Daily bonus: 200 coins + item', 'Golden achievements', 'Matchmaking priority'], vip_cta: 'Go VIP',
      biz: 'Business', biz_price: '$9.99', biz_period: '/mo', biz_features: ['Own checkpoints on the map', 'Player traffic to your venue', 'Visit analytics', 'API & support'], biz_cta: 'Add your venue',
      popular: 'Popular', yearly_hint: 'or $14.99/yr — save 58%',
    },
    download: {
      title: 'Start right now',
      subtitle: 'Browser, Android, iPhone — one account everywhere.',
      web: 'Play in browser', web_desc: 'No install, straight into battle',
      apk: 'Download APK', apk_desc: 'Android, 52 MB',
      ios: 'iPhone / iPad', ios_desc: 'Install via Safari',
      ios_s1: 'Open the game in Safari',
      ios_s2: 'Tap "Share"',
      ios_s3: 'Choose "Add to Home Screen"',
      ios_btn: 'Open in Safari',
    },
    faq: {
      title: 'FAQ',
      q1: 'Do I really have to go outside?', a1: 'Yes, that\'s the whole point. GridRunner uses real GPS — zones are captured with feet, wheels and pedals. Your couch won\'t raise your ELO.',
      q2: 'Is it free?', a2: 'Completely. The core game — trips, gangs, zone capture, arena — is free forever. VIP adds perks and exclusive vehicles, but never buys victory.',
      q3: 'How does district capture work?', a3: 'Enter a zone — your gang\'s influence grows with every step. When it exceeds the owner\'s, the zone flips color. Die on a mine — your gang loses 10% of territory.',
      q4: 'What\'s the ELO rating?', a4: 'Chess-style: take a zone from a player — take their rating points. Matchmaking pairs opponents within ±200 ELO to keep fights fair.',
      q5: 'Does it work in my city?', a5: 'Yes. Routes are built on OpenStreetMap — the game works in any city in the world with at least two streets.',
    },
    cta: { title: 'The city won\'t capture itself', desc: 'While you read this, someone\'s gang is painting your district their color.', btn: 'Enter the game' },
    auth: { create: 'Create an account — it works on both the site and the game', login_desc: 'Sign in for game & site access', no_account: 'No account?', has_account: 'Already have an account?', register: 'Register', login: 'Sign In', password_short: 'Password too short', fill: 'Fill all fields' },
    footer: { rights: 'All rights reserved.', tagline: 'Made on the streets.' },
  },
};

const CTX = createContext<{ lang: 'ru' | 'en'; t: (path: string) => any; setLang: (l: 'ru' | 'en') => void }>({
  lang: 'ru', t: (s: string) => s, setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [locale, setLocale] = useState(locales.ru);

  useEffect(() => {
    const saved = localStorage.getItem('gridrunner_lang') as 'ru' | 'en' | null;
    if (saved === 'en' || saved === 'ru') { setLang(saved); setLocale(locales[saved]); }
  }, []);

  useEffect(() => {
    localStorage.setItem('gridrunner_lang', lang);
    setLocale(locales[lang]);
  }, [lang]);

  const t = (path: string) => {
    const keys = path.split('.');
    let val: any = locale;
    for (const k of keys) { if (val == null) return path; val = val[k]; }
    return (typeof val === 'string' || Array.isArray(val)) ? val : path;
  };

  return <CTX.Provider value={{ lang, t, setLang }}>{children}</CTX.Provider>;
}

export const useT = () => useContext(CTX);
