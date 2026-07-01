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

CREATE TABLE IF NOT EXISTS uploaded_videos (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'queued', 'processing', 'completed', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS violations (
    id UUID PRIMARY KEY,
    camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
    uploaded_video_id UUID REFERENCES uploaded_videos(id) ON DELETE SET NULL,
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



-- Seed default users (pbkdf2_sha256 hashes - matching backend security config)
-- admin / admin123
-- operator / operator123
INSERT INTO users (id, username, hashed_password, role) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', '$pbkdf2-sha256$29000$JEQIASBECKFUKsV47/3fWw$fFdbkwH869wUUWpoTYfibxHABGK8tUKGREhSJNJoiao', 'admin'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'operator', '$pbkdf2-sha256$29000$6t0bo7S2FmJMSel9j7FWyg$B6c6i2Cwmfn87jy5ub89K2uRyuuaeC6MXeVNHCUdGxo', 'operator')
ON CONFLICT (username) DO NOTHING;
