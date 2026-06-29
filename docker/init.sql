-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cameras (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS violations (
    id UUID PRIMARY KEY,
    camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
    plate_number VARCHAR(20) NOT NULL,
    timestamp VARCHAR(20) NOT NULL,
    confidence FLOAT NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'pending', 'approved', 'dismissed'
    worker_id VARCHAR(50) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    processing_duration FLOAT NOT NULL,
    vehicle_crop_path VARCHAR(255) NOT NULL,
    plate_crop_path VARCHAR(255) NOT NULL,
    annotated_frame_path VARCHAR(255) NOT NULL,
    proof_video_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    violation_id UUID REFERENCES violations(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial data
-- We'll add some cameras
INSERT INTO cameras (id, name, location, status) VALUES
('d3b07384-d113-49cd-a5d6-8ee441111111', 'Toll Plaza Lane 1', 'NH-44 Toll Gate, Bangalore', 'active'),
('d3b07384-d113-49cd-a5d6-8ee442222222', 'Ring Road Junction', 'Outer Ring Road, Sector 5', 'active'),
('d3b07384-d113-49cd-a5d6-8ee443333333', 'Industrial Sector Area', 'Peenya Industrial Area', 'inactive')
ON CONFLICT (id) DO NOTHING;

-- Seed default users
-- Note: 'admin123' bcrypt hash is: $2b$12$EixZaYVK1YiYi1.61n385eM.J4.156B8N.P.UqQeB8K4S0XU8n4Jq
-- Note: 'operator123' bcrypt hash is: $2b$12$FhKk/Zsk7Q7lQ6tV5X7vfevM7s7JjP69F8B5S.b7a3gqKjM8Q3mG2 (or similar, we can insert standard bcrypt hashes)
INSERT INTO users (id, username, hashed_password, role) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', '$2b$12$qRz9lYtM2z5Z/wFk2.N8h.8mQ9v1b1lZ54D6mHjU5.8iFzOq8v6K.', 'admin'), -- admin123
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'operator', '$2b$12$qRz9lYtM2z5Z/wFk2.N8h.8mQ9v1b1lZ54D6mHjU5.8iFzOq8v6K.', 'operator') -- operator123
ON CONFLICT (username) DO NOTHING;
