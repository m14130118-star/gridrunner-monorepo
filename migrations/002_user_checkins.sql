-- Создание таблицы для чекинов
CREATE TABLE user_checkins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
    checkpoint_id INTEGER REFERENCES Checkpoints(id) ON DELETE CASCADE,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого доступа
CREATE INDEX idx_user_checkins_user ON user_checkins(user_id);
CREATE INDEX idx_user_checkins_checkpoint ON user_checkins(checkpoint_id);
CREATE INDEX idx_user_checkins_time ON user_checkins(checked_at);