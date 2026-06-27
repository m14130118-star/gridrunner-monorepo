-- Создание расширения PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Таблица пользователей
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('player', 'b2b_partner')),
    balance INTEGER DEFAULT 0,
    vip_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица транспортных средств
CREATE TABLE Vehicles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('feet', 'skateboard', 'bicycle', 'car')),
    speed_limit_kmh INTEGER NOT NULL,
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('hp', 'fuel')),
    resource_consumption_per_km FLOAT NOT NULL
);

-- Таблица чекпоинтов (кафе, парки и т.д.)
CREATE TABLE Checkpoints (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    tags VARCHAR(255)[] NOT NULL,
    owner_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица достижений пользователей
CREATE TABLE User_Achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
    achievement_name VARCHAR(100) NOT NULL,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица предпочтений пользователей
CREATE TABLE User_Preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
    liked_tags VARCHAR(255)[],
    disliked_tags VARCHAR(255)[]
);

-- Индексы для гео-запросов
CREATE INDEX idx_checkpoints_location ON Checkpoints USING GIST(location);

-- Индексы для быстрого доступа
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_role ON Users(role);
CREATE INDEX idx_checkpoints_owner ON Checkpoints(owner_id);

-- Инициализация транспортных средств
INSERT INTO Vehicles (name, type, speed_limit_kmh, resource_type, resource_consumption_per_km) VALUES
('Ноги', 'feet', 12, 'hp', 0.1),
('Скейтборд', 'skateboard', 25, 'hp', 0.2),
('Велосипед', 'bicycle', 45, 'fuel', 0.3),
('Машина', 'car', 160, 'fuel', 0.5);