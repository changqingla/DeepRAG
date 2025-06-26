-- 创建数据库
CREATE DATABASE IF NOT EXISTS rag_flow;
USE rag_flow;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users_deeprag (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建知识库表
CREATE TABLE IF NOT EXISTS datasets_deeprag (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    embedding_model VARCHAR(100),
    chunk_method VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users_deeprag(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建文档表
CREATE TABLE IF NOT EXISTS documents_deeprag (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    chunk_method VARCHAR(20) DEFAULT 'qa',
    chunk_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_parsed BOOLEAN DEFAULT FALSE,
    dataset_id VARCHAR(50),
    FOREIGN KEY (dataset_id) REFERENCES datasets_deeprag(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 检查是否已存在管理员用户，如果不存在则创建
-- 密码: admin123 (bcrypt哈希)
INSERT INTO users_deeprag (username, email, password_hash, is_active)
SELECT 'admin', 'admin@deeprag.com', '$2b$12$rA7MXZWj9VJo9DAWdKsIBevVE3JfF8LUqTUz.5.9wGlhTBLRQOdqi', TRUE
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users_deeprag WHERE username = 'admin');

-- 检查是否已存在测试用户，如果不存在则创建
-- 密码: test123 (bcrypt哈希)
INSERT INTO users_deeprag (username, email, password_hash, is_active)
SELECT 'test', 'test@deeprag.com', '$2b$12$noBHTlJPPFsOEADvYkTFOu9BDfG43kx0k326KmfD0gGTnXTMXpONe', TRUE
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users_deeprag WHERE username = 'test');

-- 创建模型表
CREATE TABLE IF NOT EXISTS models_deeprag (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- e.g., 'chat', 'embedding', 'rerank'
    base_url VARCHAR(255),           -- Optional base URL if needed
    api_key_provided BOOLEAN DEFAULT FALSE, -- Flag if API key was entered
    description TEXT,
    max_tokens INT DEFAULT 32768,        -- Add max_tokens column
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users_deeprag(id) ON DELETE CASCADE,
    INDEX idx_model_user (user_id)    -- Index for faster user-based lookups
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;