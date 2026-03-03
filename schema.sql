-- User mapping for Félix and Árpi
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
    display_name TEXT NOT NULL,
    instantly_tag TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email accounts managed via Instantly
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
    instantly_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    daily_limit INTEGER DEFAULT 50,
    current_sends INTEGER DEFAULT 0,
    status TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns managed via Instantly
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
    instantly_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    status TEXT,
    total_leads INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily historical snapshots for analytics and trends
CREATE TABLE daily_snapshots (
    id UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
    date DATE DEFAULT CURRENT_DATE,
    user_id UUID REFERENCES users(id),
    total_sends INTEGER DEFAULT 0,
    total_bounces INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    capacity_free INTEGER DEFAULT 0,
    UNIQUE(date, user_id)
);

-- Stored schedule recommendations
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
    user_id UUID REFERENCES users(id),
    lead_count INTEGER NOT NULL,
    follow_up_count INTEGER DEFAULT 0,
    suggested_start_date DATE NOT NULL,
    suggested_volume INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial users
INSERT INTO users (display_name, instantly_tag) 
VALUES 
('Félix', 'Félix manageli'),
('Árpi', 'Árpi manageli');
