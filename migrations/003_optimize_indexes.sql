-- Индексы для таблицы user_checkins
CREATE INDEX IF NOT EXISTS idx_user_checkins_user_checkpoint ON user_checkins(user_id, checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_user_checkins_time ON user_checkins(checked_at);

-- Индекс для таблицы User_Preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON User_Preferences(user_id);

-- Индекс для таблицы Vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON Vehicles(type);