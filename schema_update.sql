-- Run this in phpMyAdmin SQL tab

-- 1. Drop old bookings table and recreate
DROP TABLE IF EXISTS bookings;
CREATE TABLE bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    station_id BIGINT NOT NULL,
    charger_id BIGINT NOT NULL,
    duration_minutes INT NOT NULL,
    battery_percentage INT,
    start_time DATETIME,
    end_time DATETIME,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (station_id) REFERENCES stations(id),
    FOREIGN KEY (charger_id) REFERENCES chargers(id)
);

-- 2. Create waitlist table
DROP TABLE IF EXISTS waitlist;
CREATE TABLE waitlist (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    charger_id BIGINT NOT NULL,
    station_id BIGINT NOT NULL,
    battery_percentage INT NOT NULL,
    priority_score INT NOT NULL,
    duration_minutes INT NOT NULL,
    status VARCHAR(20) DEFAULT 'WAITING',
    joined_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (charger_id) REFERENCES chargers(id),
    FOREIGN KEY (station_id) REFERENCES stations(id)
);

-- 3. Update notifications table to support new types
ALTER TABLE notifications MODIFY COLUMN type VARCHAR(30) NOT NULL;
