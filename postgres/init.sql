-- postgres/init.sql

-- 1. 用户表 (User)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(20) DEFAULT 'user',
    silver_coins INTEGER DEFAULT 5000, -- 初始资金 5000
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITHOUT TIME ZONE
);

-- 2. 岛屿表 (Island)
CREATE TABLE IF NOT EXISTS islands (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(50) DEFAULT 'New World',
    -- 地图数据存为 JSON: 20x20 的二维数组，存地形类型
    -- 格式: [['grass', 'grass', ...], ['water', ...]]
    map_data JSONB, 
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 岛屿资源与人口状态 (IslandStatus)
CREATE TABLE IF NOT EXISTS island_status (
    id SERIAL PRIMARY KEY,
    island_id INTEGER REFERENCES islands(id) UNIQUE, -- 一个岛对应一个状态
    
    -- 基础建材
    wood INTEGER DEFAULT 50,
    brick INTEGER DEFAULT 0,

    -- T1 资源
    fish INTEGER DEFAULT 0,
    wool INTEGER DEFAULT 0,
    work_clothes INTEGER DEFAULT 0,
    
    -- T2 资源
    potato INTEGER DEFAULT 0,
    schnapps INTEGER DEFAULT 0,
    grain INTEGER DEFAULT 0,
    flour INTEGER DEFAULT 0,
    bread INTEGER DEFAULT 0,
    
    -- T3 资源
    pork INTEGER DEFAULT 0,
    sausages INTEGER DEFAULT 0,
    paper INTEGER DEFAULT 0,
    books INTEGER DEFAULT 0,

    -- 人口统计
    pop_pioneers INTEGER DEFAULT 0,
    pop_settlers INTEGER DEFAULT 0,
    pop_citizens INTEGER DEFAULT 0,
    
    last_updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 建筑实例 (Buildings)
CREATE TABLE IF NOT EXISTS buildings (
    id SERIAL PRIMARY KEY,
    island_id INTEGER REFERENCES islands(id),
    type VARCHAR(50) NOT NULL, -- e.g., 'house_t1', 'lumberjack', 'fishery'
    grid_x INTEGER NOT NULL,
    grid_y INTEGER NOT NULL,
    is_paused BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(island_id, grid_x, grid_y) -- 同一个格子上只能有一个建筑
);