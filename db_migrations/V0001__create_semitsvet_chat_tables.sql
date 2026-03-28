CREATE TABLE IF NOT EXISTS chat_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    token VARCHAR(128),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    from_user_id BIGINT NOT NULL REFERENCES chat_users(id),
    to_user_id BIGINT NOT NULL REFERENCES chat_users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_from ON chat_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_to ON chat_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_users_token ON chat_users(token);
CREATE INDEX IF NOT EXISTS idx_chat_users_username ON chat_users(username);
