const fs = require('fs');
const path = require('path');

const poisPath = path.join(__dirname, '..', 'data', 'pois.json');

const newPois = [
  // ЦАО — Центральный
  { name: 'Кофемания на Тверской', lat: 55.7645, lng: 37.6060, category: 'food', tags: { amenity: 'cafe' }, vibe_tags: ['#pavement', '#pedestrian'], base_rating: 65 },
  { name: 'ЦУМ', lat: 55.7580, lng: 37.6145, category: 'shop', tags: { shop: 'department_store' }, vibe_tags: ['#pavement', '#square'], base_rating: 50 },
  { name: 'Большой театр', lat: 55.7601, lng: 37.6186, category: 'culture', tags: { amenity: 'theatre' }, vibe_tags: ['#scenic', '#square'], base_rating: 90 },
  { name: 'Красная площадь', lat: 55.7540, lng: 37.6210, category: 'park', tags: { tourism: 'attraction' }, vibe_tags: ['#scenic', '#square', '#pedestrian', '#night'], base_rating: 95 },
  { name: 'Елисеевский магазин', lat: 55.7655, lng: 37.6055, category: 'shop', tags: { shop: 'grocery' }, vibe_tags: ['#scenic', '#pavement'], base_rating: 60 },
  { name: 'Ресторан Dr. Живаго', lat: 55.7572, lng: 37.6138, category: 'food', tags: { amenity: 'restaurant' }, vibe_tags: ['#scenic', '#night'], base_rating: 75 },
  { name: 'ГУМ', lat: 55.7548, lng: 37.6218, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#scenic', '#pedestrian', '#square'], base_rating: 70 },
  { name: 'Музей Истории', lat: 55.7555, lng: 37.6170, category: 'culture', tags: { tourism: 'museum' }, vibe_tags: ['#scenic', '#square'], base_rating: 80 },
  { name: 'Парк Зарядье', lat: 55.7510, lng: 37.6230, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#view', '#panorama', '#bridge'], base_rating: 88 },
  { name: 'Чистые пруды', lat: 55.7620, lng: 37.6400, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#embankment', '#alley'], base_rating: 72 },
  { name: 'Патриарший мост', lat: 55.7445, lng: 37.6070, category: 'view', tags: { highway: 'pedestrian' }, vibe_tags: ['#scenic', '#view', '#bridge', '#embankment', '#night'], base_rating: 85 },
  { name: 'Музей Пушкина', lat: 55.7440, lng: 37.6050, category: 'culture', tags: { tourism: 'museum' }, vibe_tags: ['#scenic', '#courtyard'], base_rating: 82 },
  { name: 'Ресторан «Пушкинъ»', lat: 55.7648, lng: 37.6080, category: 'food', tags: { amenity: 'restaurant' }, vibe_tags: ['#scenic', '#courtyard'], base_rating: 78 },
  { name: 'ТЦ Атриум', lat: 55.7595, lng: 37.6470, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#pavement', '#pedestrian'], base_rating: 45 },
  { name: 'Сквер у Никитских ворот', lat: 55.7580, lng: 37.5980, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#alley', '#smooth_flow'], base_rating: 55 },

  // САО — Северный
  { name: 'Парк Дубки', lat: 55.8310, lng: 37.5550, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley', '#smooth_flow'], base_rating: 65 },
  { name: 'Речной вокзал', lat: 55.8535, lng: 37.4765, category: 'culture', tags: { historic: 'building' }, vibe_tags: ['#scenic', '#embankment', '#panorama'], base_rating: 78 },
  { name: 'Парк Северное Тушино', lat: 55.8650, lng: 37.4450, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#embankment', '#smooth_flow'], base_rating: 70 },
  { name: 'Спорткомплекс Динамо', lat: 55.7900, lng: 37.5580, category: 'sport', tags: { leisure: 'stadium' }, vibe_tags: ['#asphalt', '#pavement'], base_rating: 60 },
  { name: 'ВДНХ (северный вход)', lat: 55.8225, lng: 37.6410, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#square', '#pedestrian'], base_rating: 85 },
  { name: 'Стадион ЦСКА', lat: 55.7880, lng: 37.5110, category: 'sport', tags: { leisure: 'stadium' }, vibe_tags: ['#asphalt', '#pavement'], base_rating: 65 },
  { name: 'Тимирязевский парк', lat: 55.8170, lng: 37.5370, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley', '#dark_vibe'], base_rating: 60 },
  { name: 'Яхт-клуб на Химкинском', lat: 55.8400, lng: 37.4580, category: 'sport', tags: { leisure: 'marina' }, vibe_tags: ['#scenic', '#embankment', '#view'], base_rating: 72 },

  // СВАО — Северо-Восточный
  { name: 'Главный ботанический сад', lat: 55.8380, lng: 37.6000, category: 'park', tags: { leisure: 'garden' }, vibe_tags: ['#scenic', '#alley', '#smooth_flow'], base_rating: 75 },
  { name: 'Останкинская телебашня', lat: 55.8200, lng: 37.6115, category: 'view', tags: { tourism: 'attraction' }, vibe_tags: ['#scenic', '#view', '#panorama'], base_rating: 90 },
  { name: 'Спорткомплекс Олимпийский', lat: 55.7800, lng: 37.6250, category: 'sport', tags: { leisure: 'stadium' }, vibe_tags: ['#asphalt', '#pedestrian'], base_rating: 68 },
  { name: 'Парк Сокольники', lat: 55.7900, lng: 37.6800, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley', '#smooth_flow', '#pavement'], base_rating: 82 },
  { name: 'Лосиный Остров', lat: 55.8580, lng: 37.7080, category: 'park', tags: { leisure: 'nature_reserve' }, vibe_tags: ['#scenic', '#dark_vibe', '#alley'], base_rating: 74 },
  { name: 'Усадьба Останкино', lat: 55.8260, lng: 37.6050, category: 'culture', tags: { historic: 'estate' }, vibe_tags: ['#scenic', '#courtyard', '#alley'], base_rating: 76 },
  { name: 'Сквер на ВДНХ', lat: 55.8280, lng: 37.6320, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#square', '#pedestrian'], base_rating: 70 },
  { name: 'ТЦ Золотой Вавилон', lat: 55.8100, lng: 37.6380, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#pavement', '#pedestrian'], base_rating: 40 },

  // ВАО — Восточный
  { name: 'Измайловский парк', lat: 55.7880, lng: 37.7520, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley', '#smooth_flow', '#dark_vibe'], base_rating: 78 },
  { name: 'Кремль в Измайлово', lat: 55.7950, lng: 37.7550, category: 'culture', tags: { tourism: 'attraction' }, vibe_tags: ['#scenic', '#square', '#pedestrian'], base_rating: 72 },
  { name: 'Терлецкая дубрава', lat: 55.7700, lng: 37.8020, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley', '#dark_vibe'], base_rating: 62 },
  { name: 'Сокольники (восточная часть)', lat: 55.7970, lng: 37.7080, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley', '#pavement'], base_rating: 68 },
  { name: 'Спорткомплекс Локомотив', lat: 55.8060, lng: 37.7370, category: 'sport', tags: { leisure: 'stadium' }, vibe_tags: ['#asphalt', '#pavement'], base_rating: 58 },
  { name: 'Сиреневый сад', lat: 55.8020, lng: 37.7840, category: 'park', tags: { leisure: 'garden' }, vibe_tags: ['#scenic', '#alley'], base_rating: 55 },
  { name: 'ТЦ Щёлково', lat: 55.8100, lng: 37.7980, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#pavement', '#pedestrian'], base_rating: 38 },

  // ЮВАО — Юго-Восточный
  { name: 'Кузьминский парк', lat: 55.6850, lng: 37.7650, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley', '#smooth_flow', '#embankment'], base_rating: 70 },
  { name: 'Музей-усадьба Кузьминки', lat: 55.6900, lng: 37.7700, category: 'culture', tags: { historic: 'estate' }, vibe_tags: ['#scenic', '#courtyard', '#alley'], base_rating: 74 },
  { name: 'Парк 850-летия Москвы', lat: 55.7100, lng: 37.7200, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#embankment', '#smooth_flow'], base_rating: 66 },
  { name: 'ТЦ Мозаика', lat: 55.7050, lng: 37.7100, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#pavement', '#pedestrian'], base_rating: 42 },
  { name: 'Сквер на Волгоградском', lat: 55.7180, lng: 37.7280, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#pavement', '#asphalt'], base_rating: 40 },
  { name: 'Завод ЗИЛ (территория)', lat: 55.7060, lng: 37.6480, category: 'other', tags: { historic: 'industrial' }, vibe_tags: ['#industrial', '#abandoned', '#factory', '#graffiti', '#urban_underground'], base_rating: 80 },
  { name: 'Парк Артём Боровик', lat: 55.7000, lng: 37.7400, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley'], base_rating: 50 },

  // ЮАО — Южный
  { name: 'Парк Царицыно', lat: 55.6150, lng: 37.6820, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley', '#embankment', '#smooth_flow'], base_rating: 88 },
  { name: 'Музей Царицыно', lat: 55.6120, lng: 37.6850, category: 'culture', tags: { tourism: 'museum' }, vibe_tags: ['#scenic', '#courtyard', '#square'], base_rating: 82 },
  { name: 'Коломенское', lat: 55.6650, lng: 37.6700, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#view', '#panorama', '#embankment'], base_rating: 86 },
  { name: 'Нагатинская пойма', lat: 55.6780, lng: 37.6520, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#embankment', '#smooth_flow', '#bridge'], base_rating: 62 },
  { name: 'Южный речной вокзал', lat: 55.6770, lng: 37.6430, category: 'culture', tags: { historic: 'building' }, vibe_tags: ['#scenic', '#embankment', '#panorama'], base_rating: 74 },
  { name: 'Сквер у метро Кантемировская', lat: 55.6350, lng: 37.6550, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#pavement', '#asphalt'], base_rating: 38 },
  { name: 'ТЦ Columbus', lat: 55.6400, lng: 37.6600, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#pavement', '#pedestrian'], base_rating: 45 },
  { name: 'Велотрек Крылатское', lat: 55.6750, lng: 37.6200, category: 'sport', tags: { leisure: 'sports_centre' }, vibe_tags: ['#asphalt', '#smooth_flow'], base_rating: 70 },

  // ЮЗАО — Юго-Западный
  { name: 'Воробьёвы горы (смотровая)', lat: 55.7150, lng: 37.5400, category: 'view', tags: { tourism: 'viewpoint' }, vibe_tags: ['#scenic', '#view', '#panorama', '#bridge'], base_rating: 95 },
  { name: 'Лужники', lat: 55.7150, lng: 37.5550, category: 'sport', tags: { leisure: 'stadium' }, vibe_tags: ['#asphalt', '#pavement', '#pedestrian'], base_rating: 80 },
  { name: 'Нескучный сад', lat: 55.7180, lng: 37.5850, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley', '#smooth_flow', '#courtyard'], base_rating: 76 },
  { name: 'Андреевский мост', lat: 55.7140, lng: 37.5720, category: 'view', tags: { highway: 'pedestrian' }, vibe_tags: ['#scenic', '#view', '#bridge', '#embankment', '#night'], base_rating: 82 },
  { name: 'ТЦ Метромолл', lat: 55.7220, lng: 37.6000, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#pavement', '#pedestrian'], base_rating: 48 },
  { name: 'Парк 50-летия Октября', lat: 55.7080, lng: 37.5300, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley', '#smooth_flow'], base_rating: 60 },
  { name: 'Университетская площадь', lat: 55.7030, lng: 37.5350, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#square', '#pedestrian'], base_rating: 58 },
  { name: 'Спорткомплекс Лужники (малый)', lat: 55.7180, lng: 37.5480, category: 'sport', tags: { leisure: 'sports_centre' }, vibe_tags: ['#asphalt', '#pavement'], base_rating: 65 },

  // ЗАО — Западный
  { name: 'Парк Победы', lat: 55.7300, lng: 37.5150, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#view', '#panorama', '#square', '#pedestrian'], base_rating: 86 },
  { name: 'Музей Победы', lat: 55.7320, lng: 37.5170, category: 'culture', tags: { tourism: 'museum' }, vibe_tags: ['#scenic', '#square'], base_rating: 84 },
  { name: 'Арка Победы', lat: 55.7350, lng: 37.5200, category: 'culture', tags: { historic: 'monument' }, vibe_tags: ['#scenic', '#square', '#night'], base_rating: 78 },
  { name: 'Крылатские холмы', lat: 55.7600, lng: 37.4200, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#view', '#panorama', '#smooth_flow'], base_rating: 74 },
  { name: 'Серебряный Бор', lat: 55.7820, lng: 37.4200, category: 'park', tags: { leisure: 'beach' }, vibe_tags: ['#scenic', '#embankment', '#smooth_flow', '#dark_vibe'], base_rating: 80 },
  { name: 'Гребной канал', lat: 55.7700, lng: 37.4250, category: 'sport', tags: { leisure: 'sports_centre' }, vibe_tags: ['#embankment', '#smooth_flow', '#asphalt'], base_rating: 68 },
  { name: 'ТЦ Европейский', lat: 55.7420, lng: 37.5400, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#pavement', '#pedestrian'], base_rating: 50 },
  { name: 'Сквер у метро Кутузовская', lat: 55.7400, lng: 37.5340, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#pavement', '#asphalt'], base_rating: 42 },

  // СЗАО — Северо-Западный
  { name: 'Парк Тушино', lat: 55.8280, lng: 37.4450, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#embankment', '#smooth_flow'], base_rating: 68 },
  { name: 'Строгинский залив', lat: 55.8050, lng: 37.4200, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#embankment', '#view'], base_rating: 72 },
  { name: 'Москва-Сити (смотровая)', lat: 55.7500, lng: 37.5400, category: 'view', tags: { tourism: 'viewpoint' }, vibe_tags: ['#scenic', '#view', '#panorama', '#night'], base_rating: 90 },
  { name: 'Парк Дружбы', lat: 55.8360, lng: 37.4880, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley', '#smooth_flow'], base_rating: 64 },
  { name: 'Сквер на Сходненской', lat: 55.8480, lng: 37.4380, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#pavement', '#asphalt'], base_rating: 45 },
  { name: 'ТЦ Калейдоскоп', lat: 55.8100, lng: 37.4720, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#pavement', '#pedestrian'], base_rating: 44 },
  { name: 'Спорткомплекс Янтарь', lat: 55.8200, lng: 37.4380, category: 'sport', tags: { leisure: 'sports_centre' }, vibe_tags: ['#asphalt', '#smooth_flow'], base_rating: 55 },

  // Зеленоград
  { name: 'Парк 40-летия Победы', lat: 55.9850, lng: 37.1950, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley', '#smooth_flow'], base_rating: 62 },
  { name: 'Сквер у Дворца культуры', lat: 55.9920, lng: 37.2000, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#pavement', '#square', '#pedestrian'], base_rating: 50 },
  { name: 'Чёрное озеро', lat: 55.9780, lng: 37.1880, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#embankment', '#dark_vibe'], base_rating: 66 },
  { name: 'ТЦ Столица', lat: 55.9900, lng: 37.2100, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#pavement', '#pedestrian'], base_rating: 38 },
  { name: 'Спорткомплекс Зеленоград', lat: 55.9820, lng: 37.2150, category: 'sport', tags: { leisure: 'sports_centre' }, vibe_tags: ['#asphalt', '#pavement'], base_rating: 52 },

  // Дополнительные food
  { name: 'Кофе-бар Double B', lat: 55.7600, lng: 37.6260, category: 'food', tags: { amenity: 'cafe' }, vibe_tags: ['#urban_underground', '#courtyard'], base_rating: 68 },
  { name: 'Ресторан «Сахалин»', lat: 55.7565, lng: 37.6150, category: 'food', tags: { amenity: 'restaurant' }, vibe_tags: ['#scenic', '#night'], base_rating: 80 },
  { name: 'Пироги на Дмитровке', lat: 55.7700, lng: 37.5950, category: 'food', tags: { amenity: 'cafe' }, vibe_tags: ['#courtyard', '#pavement'], base_rating: 55 },
  { name: 'Ватрушка (кафе)', lat: 55.7555, lng: 37.6300, category: 'food', tags: { amenity: 'cafe' }, vibe_tags: ['#pedestrian', '#alley'], base_rating: 58 },

  // Дополнительные culture
  { name: 'Третьяковская галерея', lat: 55.7410, lng: 37.6205, category: 'culture', tags: { tourism: 'museum' }, vibe_tags: ['#scenic', '#courtyard'], base_rating: 92 },
  { name: 'Гараж (музей)', lat: 55.7540, lng: 37.5990, category: 'culture', tags: { tourism: 'museum' }, vibe_tags: ['#urban_underground', '#industrial', '#graffiti'], base_rating: 78 },
  { name: 'Театр Наций', lat: 55.7575, lng: 37.6190, category: 'culture', tags: { amenity: 'theatre' }, vibe_tags: ['#scenic', '#courtyard'], base_rating: 74 },
  { name: 'МХТ им. Чехова', lat: 55.7610, lng: 37.6150, category: 'culture', tags: { amenity: 'theatre' }, vibe_tags: ['#scenic', '#pavement'], base_rating: 76 },

  // Дополнительные sport
  { name: 'СК Мегаспорт', lat: 55.7720, lng: 37.5420, category: 'sport', tags: { leisure: 'stadium' }, vibe_tags: ['#asphalt', '#pavement'], base_rating: 66 },
  { name: 'Воробьёвы горы (трассы)', lat: 55.7200, lng: 37.5350, category: 'sport', tags: { leisure: 'track' }, vibe_tags: ['#scenic', '#asphalt', '#smooth_flow'], base_rating: 74 },
  { name: 'Скейтпарк на Крылатском', lat: 55.7620, lng: 37.4250, category: 'sport', tags: { leisure: 'sports_centre' }, vibe_tags: ['#asphalt', '#smooth_flow', '#graffiti'], base_rating: 82 },
  { name: 'BMX-парк в Сокольниках', lat: 55.7880, lng: 37.6880, category: 'sport', tags: { leisure: 'sports_centre' }, vibe_tags: ['#asphalt', '#smooth_flow'], base_rating: 70 },

  // Дополнительные park / view
  { name: 'Смотровая на РАН', lat: 55.7010, lng: 37.5650, category: 'view', tags: { tourism: 'viewpoint' }, vibe_tags: ['#scenic', '#view', '#panorama'], base_rating: 78 },
  { name: 'Александровский сад', lat: 55.7525, lng: 37.6130, category: 'park', tags: { leisure: 'garden' }, vibe_tags: ['#scenic', '#alley', '#pedestrian'], base_rating: 74 },
  { name: 'Бульварное кольцо', lat: 55.7620, lng: 37.6200, category: 'park', tags: { highway: 'pedestrian' }, vibe_tags: ['#pedestrian', '#alley', '#smooth_flow'], base_rating: 60 },
  { name: 'Путевой дворец (сквер)', lat: 55.8340, lng: 37.5040, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#scenic', '#alley'], base_rating: 56 },

  // Дополнительные shop
  { name: 'ТЦ Метрополис', lat: 55.8250, lng: 37.5000, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#pavement', '#pedestrian'], base_rating: 48 },
  { name: 'ТЦ Афимолл Сити', lat: 55.7480, lng: 37.5380, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#pavement', '#pedestrian'], base_rating: 52 },
  { name: 'ТЦ Охотный Ряд', lat: 55.7560, lng: 37.6140, category: 'shop', tags: { shop: 'mall' }, vibe_tags: ['#pedestrian', '#square'], base_rating: 55 },

  // Дополнительные other
  { name: 'Туннель на Кутузовском', lat: 55.7400, lng: 37.5400, category: 'other', tags: { highway: 'tunnel' }, vibe_tags: ['#tunnel', '#dark_vibe', '#industrial', '#night'], base_rating: 68 },
  { name: 'Арт-кластер Красный Октябрь', lat: 55.7420, lng: 37.6130, category: 'culture', tags: { tourism: 'attraction' }, vibe_tags: ['#urban_underground', '#graffiti', '#industrial', '#embankment', '#night'], base_rating: 84 },
  { name: 'Депо (гастроцентр)', lat: 55.7640, lng: 37.5800, category: 'food', tags: { amenity: 'restaurant' }, vibe_tags: ['#industrial', '#urban_underground', '#graffiti', '#courtyard'], base_rating: 76 },
  { name: 'Павелецкая набережная', lat: 55.7300, lng: 37.6400, category: 'park', tags: { leisure: 'park' }, vibe_tags: ['#embankment', '#scenic', '#smooth_flow', '#pedestrian'], base_rating: 64 },
  { name: 'Китай-город (стены)', lat: 55.7530, lng: 37.6310, category: 'culture', tags: { historic: 'monument' }, vibe_tags: ['#scenic', '#pedestrian', '#alley'], base_rating: 66 },
  { name: 'Граффити на Бауманской', lat: 55.7710, lng: 37.6800, category: 'culture', tags: { tourism: 'artwork' }, vibe_tags: ['#graffiti', '#urban_underground', '#courtyard'], base_rating: 70 },
  { name: 'Заброшенная стройка на Мосфильмовской', lat: 55.7250, lng: 37.5050, category: 'other', tags: { historic: 'industrial' }, vibe_tags: ['#abandoned', '#dark_vibe', '#industrial', '#urban_underground'], base_rating: 72 },
  { name: 'Ночной Арбат', lat: 55.7480, lng: 37.5900, category: 'other', tags: { highway: 'pedestrian' }, vibe_tags: ['#night', '#pedestrian', '#scenic', '#square'], base_rating: 74 },
  { name: 'Переход на Киевской', lat: 55.7420, lng: 37.5640, category: 'other', tags: { highway: 'pedestrian' }, vibe_tags: ['#tunnel', '#urban_underground', '#dark_vibe', '#graffiti'], base_rating: 60 },
];

let pois = [];
try {
  pois = JSON.parse(fs.readFileSync(poisPath, 'utf8'));
} catch {
  pois = [];
}

const existingNames = new Set(pois.map(p => p.name));
let nextId = pois.length > 0 ? Math.max(...pois.map(p => p.id)) + 1 : 1;
let seededCount = 0;

for (const poi of newPois) {
  if (existingNames.has(poi.name)) continue;

  const entry = {
    id: nextId++,
    osm_id: `osm_${nextId}`,
    name: poi.name,
    lat: poi.lat,
    lng: poi.lng,
    category: poi.category,
    vibe_tags: poi.vibe_tags,
    base_rating: poi.base_rating,
    votes: { up: 0, down: 0 },
    voters: {},
    approved: true,
    suggested_by: null,
    tags: poi.tags,
    is_active: true,
    restore_hp: Math.round(poi.base_rating * 0.35),
    check_in_radius: 30,
    gold_reward: Math.round(poi.base_rating * 0.6),
    xp_reward: Math.round(poi.base_rating * 0.3),
  };

  pois.push(entry);
  existingNames.add(poi.name);
  seededCount++;
}

fs.writeFileSync(poisPath, JSON.stringify(pois, null, 2));
console.log(`Seeded ${seededCount} new POIs. Total: ${pois.length}`);
