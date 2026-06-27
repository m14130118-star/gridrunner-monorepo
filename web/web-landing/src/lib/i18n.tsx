import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const locales: Record<string, any> = {
  ru: {
    nav: { features: 'Возможности', pricing: 'Тарифы', login: 'Войти', register: 'Регистрация' },
    hero: { title: 'Преврати город в свою игру', desc: 'GridRunner — геймифицированный навигатор, который превращает прогулки по городу в RPG-приключение. Зарабатывай XP, захватывай районы, открывай достижения.', cta: 'Начать игру', learn: 'Узнать больше', android: 'Скачать APK', ios: 'App Store' },
    features: { title: 'Всё, что нужно для приключений', subtitle: 'Город — это огромная игровая карта. Открой её заново.', gps: 'GPS-Квесты', gps_desc: 'Исследуй реальные локации, зарабатывай XP и золото. Каждая прогулка — новое приключение.', clans: 'Кланы и Районы', clans_desc: 'Объединяйся с друзьями, захватывай территории города. Война районов начинается!', garage: '3D Гараж', garage_desc: 'Коллекционируй и улучшай транспорт: от скейта до суперкара. Каждый визик уникален.', b2b: 'B2B для Бизнеса', b2b_desc: 'Создавай чекпоинты, привлекай посетителей, смотри аналитику в реальном времени.', music: 'Твой Плейлист', music_desc: 'Динамическая музыка под твой маршрут, транспорт и настроение. Саундтрек к каждой поездке.', vip: 'VIP Подписка', vip_desc: 'Эксклюзивный транспорт, золотые достижения и безлимитные поездки. Стань легендой.' },
    pricing: { title: 'Выбери свой путь', subtitle: 'Стартуй бесплатно, прокачивайся до VIP или открывай бизнес-возможности.', free: 'Свобода', free_price: '0', free_period: 'навсегда', free_features: ['Пешком, скейт, велосипед', 'Базовые достижения', 'Ежедневные квесты', 'Чат в клане'], free_cta: 'Играть бесплатно', vip: 'VIP', vip_price: '199', vip_period: '/мес', vip_features: ['Всё из Свободы', 'Автомобиль и мотоцикл', 'Золотые достижения', 'Эксклюзивные скины', 'Безлимитные поездки'], vip_cta: 'Оформить', biz: 'Корпоративный', biz_price: '999', biz_period: '/мес', biz_features: ['Всё из VIP', 'API для бизнеса', 'Свои чекпоинты', 'Аналитика', 'Приоритетная поддержка'], biz_cta: 'Оформить', popular: 'Популярное' },
    cta: { title: 'Готов к приключению?', desc: 'Загружай GridRunner и преврати свою следующую прогулку в эпический квест.', btn: 'Запустить игру' },
    auth: { create: 'Создай аккаунт — он будет работать и на сайте, и в игре', login_desc: 'Войди в аккаунт для игры и сайта', no_account: 'Нет аккаунта?', has_account: 'Уже есть аккаунт?', register: 'Регистрация', login: 'Войти', password_short: 'Пароль слишком короткий', fill: 'Заполните все поля' },
    footer: { rights: 'Все права защищены.' },
  },
  en: {
    nav: { features: 'Features', pricing: 'Pricing', login: 'Sign In', register: 'Register' },
    hero: { title: 'Turn the city into your game', desc: 'GridRunner is a gamified navigation app that turns your city walks into an RPG adventure. Earn XP, capture districts, unlock achievements.', cta: 'Start Playing', learn: 'Learn More', android: 'Download APK', ios: 'App Store' },
    features: { title: 'Everything you need for adventure', subtitle: 'The city is a huge game map. Explore it anew.', gps: 'GPS Quests', gps_desc: 'Explore real locations, earn XP and gold. Every walk is a new adventure.', clans: 'Clans & Districts', clans_desc: 'Team up with friends, capture city territories. District wars begin!', garage: '3D Garage', garage_desc: 'Collect and upgrade vehicles: from skateboard to supercar. Each unique.', b2b: 'B2B for Business', b2b_desc: 'Create checkpoints, attract visitors, see real-time analytics.', music: 'Your Playlist', music_desc: 'Dynamic music for your route, vehicle and mood. Soundtrack for every trip.', vip: 'VIP Subscription', vip_desc: 'Exclusive vehicles, golden achievements, unlimited trips. Become a legend.' },
    pricing: { title: 'Choose your path', subtitle: 'Start free, upgrade to VIP, or unlock business features.', free: 'Free', free_price: '0', free_period: 'forever', free_features: ['Walk, skateboard, bicycle', 'Basic achievements', 'Daily quests', 'Clan chat'], free_cta: 'Play Free', vip: 'VIP', vip_price: '1.99', vip_period: '/mo', vip_features: ['Everything in Free', 'Car & motorcycle', 'Golden achievements', 'Exclusive skins', 'Unlimited trips'], vip_cta: 'Subscribe', biz: 'Enterprise', biz_price: '9.99', biz_period: '/mo', biz_features: ['Everything in VIP', 'Business API', 'Custom checkpoints', 'Analytics', 'Priority support'], biz_cta: 'Subscribe', popular: 'Popular' },
    cta: { title: 'Ready for adventure?', desc: 'Launch GridRunner and turn your next walk into an epic quest.', btn: 'Launch Game' },
    auth: { create: 'Create an account — it works on both the site and the game', login_desc: 'Sign in for game & site access', no_account: 'No account?', has_account: 'Already have an account?', register: 'Register', login: 'Sign In', password_short: 'Password too short', fill: 'Fill all fields' },
    footer: { rights: 'All rights reserved.' },
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
