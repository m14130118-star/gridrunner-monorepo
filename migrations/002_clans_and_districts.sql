-- Создание таблицы кланов
CREATE TABLE Clans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    avatar VARCHAR(255),
    total_xp BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы участников клана
CREATE TABLE Clan_Members (
    user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
    clan_id INTEGER REFERENCES Clans(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('leader', 'officer', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, clan_id)
);

-- Создание таблицы районов (Districts) для захвата территорий
CREATE TABLE Districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    polygon GEOGRAPHY(POLYGON, 4326) NOT NULL,
    clan_id INTEGER REFERENCES Clans(id) ON DELETE SET NULL,
    capture_points BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска районов по клану
CREATE INDEX idx_districts_clan ON Districts(clan_id);

-- Индекс для гео-запросов (определение района по чекину)
CREATE INDEX idx_districts_polygon ON Districts USING GIST(polygon);

-- Создание таблицы истории захвата районов
CREATE TABLE District_Capture_History (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES Districts(id) ON DELETE CASCADE,
    old_clan_id INTEGER REFERENCES Clans(id) ON DELETE SET NULL,
    new_clan_id INTEGER REFERENCES Clans(id) ON DELETE SET NULL,
    capture_points_transferred BIGINT NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Триггер для обновления total_xp клана при захвате района
CREATE OR REPLACE FUNCTION update_clan_xp_on_capture()
RETURNS TRIGGER AS $$
BEGIN
    -- Если район перешел к новому клану, добавляем очки к его total_xp
    IF NEW.clan_id IS NOT NULL AND (OLD.clan_id IS NULL OR OLD.clan_id != NEW.clan_id) THEN
        UPDATE Clans
        SET total_xp = total_xp + NEW.capture_points,
            updated_at = NOW()
        WHERE id = NEW.clan_id;
    END IF;

    -- Если район был отобран у старого клана, вычитаем очки
    IF OLD.clan_id IS NOT NULL AND (NEW.clan_id IS NULL OR NEW.clan_id != OLD.clan_id) THEN
        UPDATE Clans
        SET total_xp = GREATEST(0, total_xp - OLD.capture_points), -- Защита от отрицательных значений
            updated_at = NOW()
        WHERE id = OLD.clan_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для логирования истории захвата
CREATE OR REPLACE FUNCTION log_district_capture()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.clan_id IS DISTINCT FROM NEW.clan_id THEN
        INSERT INTO District_Capture_History (
            district_id,
            old_clan_id,
            new_clan_id,
            capture_points_transferred
        )
        VALUES (
            NEW.id,
            OLD.clan_id,
            NEW.clan_id,
            NEW.capture_points
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Навешиваем триггер на таблицу Districts
CREATE TRIGGER trg_update_clan_xp_on_capture
AFTER UPDATE ON Districts
FOR EACH ROW
EXECUTE FUNCTION update_clan_xp_on_capture();

CREATE TRIGGER trg_log_district_capture
AFTER UPDATE ON Districts
FOR EACH ROW
EXECUTE FUNCTION log_district_capture();