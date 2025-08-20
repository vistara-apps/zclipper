-- ZClipper Supabase PostgreSQL Schema
-- Initial migration for Supabase integration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    clips_generated INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- User tokens table for authentication
CREATE TABLE IF NOT EXISTS user_tokens (
    token UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_tokens_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    session_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    chat_speed INTEGER NOT NULL DEFAULT 0,
    viral_score DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    clips_generated INTEGER NOT NULL DEFAULT 0,
    revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_channel ON sessions(channel);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Clips table
CREATE TABLE IF NOT EXISTS clips (
    clip_id UUID PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    filename TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 0,
    size_mb DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    viral_score DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    chat_velocity INTEGER NOT NULL DEFAULT 0,
    revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    viral_messages JSONB NOT NULL DEFAULT '[]'::JSONB,
    thumbnail_url TEXT,
    ai_enhanced BOOLEAN NOT NULL DEFAULT FALSE,
    web3_title TEXT,
    web3_hashtags JSONB NOT NULL DEFAULT '[]'::JSONB,
    community_targets JSONB NOT NULL DEFAULT '[]'::JSONB,
    distribution_strategy JSONB NOT NULL DEFAULT '{}'::JSONB,
    platform_video_id TEXT,
    platform_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_clips_session FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_clips_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_clips_session_id ON clips(session_id);
CREATE INDEX IF NOT EXISTS idx_clips_user_id ON clips(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_created_at ON clips(created_at);
CREATE INDEX IF NOT EXISTS idx_clips_viral_score ON clips(viral_score);

-- Subscriptions table for monetization
CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    plan TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Clip templates table for viral content features
CREATE TABLE IF NOT EXISTS clip_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    overlay_type TEXT NOT NULL,
    overlay_config JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on premium status for faster lookups
CREATE INDEX IF NOT EXISTS idx_clip_templates_premium ON clip_templates(is_premium);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp on users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RPC function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
    total_clips INTEGER,
    total_revenue DECIMAL(10, 2),
    active_sessions INTEGER,
    avg_viral_score DECIMAL(5, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(s.clips_generated), 0)::INTEGER AS total_clips,
        COALESCE(SUM(s.revenue), 0) AS total_revenue,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END)::INTEGER AS active_sessions,
        COALESCE(AVG(c.viral_score), 0) AS avg_viral_score
    FROM
        sessions s
    LEFT JOIN
        clips c ON s.session_id = c.session_id
    WHERE
        s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- RPC function to get trending clips
CREATE OR REPLACE FUNCTION get_trending_clips(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    clip_id UUID,
    user_id UUID,
    username TEXT,
    filename TEXT,
    thumbnail_url TEXT,
    viral_score DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.clip_id,
        c.user_id,
        u.username,
        c.filename,
        c.thumbnail_url,
        c.viral_score,
        c.created_at
    FROM
        clips c
    JOIN
        users u ON c.user_id = u.user_id
    ORDER BY
        c.viral_score DESC, c.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default clip templates
INSERT INTO clip_templates (name, description, overlay_type, overlay_config, is_premium)
VALUES
    ('Standard', 'Basic overlay with channel name and timestamp', 'standard', '{"text_color": "#ffffff", "bg_color": "#000000", "opacity": 0.8}'::JSONB, FALSE),
    ('Explosive Text', 'Animated text that pops with each message', 'explosive_text', '{"animation": "pop", "text_color": "#ff0000", "bg_color": "#000000", "opacity": 0.9}'::JSONB, FALSE),
    ('Neon Glow', 'Vibrant neon effect for eye-catching clips', 'neon', '{"glow_color": "#00ff00", "text_color": "#ffffff", "animation": "pulse"}'::JSONB, TRUE),
    ('Minimal Clean', 'Subtle, clean overlay for professional look', 'minimal', '{"text_color": "#ffffff", "bg_color": "transparent", "border": "1px solid #ffffff"}'::JSONB, FALSE),
    ('Viral Moment', 'Highlights the viral moment with special effects', 'viral_moment', '{"highlight_color": "#ff00ff", "text_effect": "zoom", "sound_effect": "boom"}'::JSONB, TRUE);

-- Create row level security policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for users table
CREATE POLICY users_policy ON users
    USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

-- Policy for sessions table
CREATE POLICY sessions_policy ON sessions
    USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

-- Policy for clips table
CREATE POLICY clips_policy ON clips
    USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

-- Policy for subscriptions table
CREATE POLICY subscriptions_policy ON subscriptions
    USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

-- Allow public read access to clip templates
ALTER TABLE clip_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY clip_templates_read_policy ON clip_templates
    FOR SELECT USING (TRUE);

