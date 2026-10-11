-- ============================================================
-- Smart EV Charging Optimization System - MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS ev_charging_db;
USE ev_charging_db;

SET sql_mode = '';
SET GLOBAL sql_mode = '';

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    vehicle_number VARCHAR(30),
    city VARCHAR(100),
    role ENUM('USER','MANAGER','ADMIN') NOT NULL DEFAULT 'USER',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- STATIONS
-- ------------------------------------------------------------
CREATE TABLE stations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    total_chargers INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    manager_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- CHARGERS
-- ------------------------------------------------------------
CREATE TABLE chargers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    station_id BIGINT NOT NULL,
    charger_type ENUM('FAST','NORMAL','SUPER') NOT NULL,
    charger_number VARCHAR(20) NOT NULL,
    power_output DECIMAL(5,2),
    status ENUM('ACTIVE','MAINTENANCE','INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- SLOTS
-- ------------------------------------------------------------
CREATE TABLE slots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    charger_id BIGINT NOT NULL,
    station_id BIGINT NOT NULL,
    slot_number VARCHAR(20) NOT NULL,
    slot_state ENUM('AVAILABLE','RESERVED','CHARGING','MAINTENANCE') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (charger_id) REFERENCES chargers(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- BOOKINGS
-- ------------------------------------------------------------
CREATE TABLE bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    station_id BIGINT NOT NULL,
    charger_id BIGINT NOT NULL,
    slot_id BIGINT NOT NULL,
    booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_start TIMESTAMP NULL DEFAULT NULL,
    scheduled_end TIMESTAMP NULL DEFAULT NULL,
    actual_start TIMESTAMP NULL DEFAULT NULL,
    actual_end TIMESTAMP NULL DEFAULT NULL,
    status ENUM('CONFIRMED','CHARGING','COMPLETED','CANCELLED') DEFAULT 'CONFIRMED',
    total_cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (station_id) REFERENCES stations(id),
    FOREIGN KEY (charger_id) REFERENCES chargers(id),
    FOREIGN KEY (slot_id) REFERENCES slots(id)
);

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    booking_id BIGINT,
    type ENUM('BOOKING_CONFIRMED','CHARGING_STARTED','CHARGING_COMPLETED','GENERAL') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- SEED DATA
-- ------------------------------------------------------------
INSERT INTO users (name, email, password, phone, role) VALUES
('Admin User', 'admin@evcharging.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '9999999999', 'ADMIN');

INSERT INTO stations (name, address, city, latitude, longitude, total_chargers) VALUES
('Green Energy Hub', '12 Main Street, Anna Nagar', 'Chennai', 13.0827, 80.2707, 6),
('EV Power Station Alpha', '45 GST Road, Tambaram', 'Chennai', 12.9249, 80.1000, 4),
('ElectroDrive Centre', '78 Mount Road, T. Nagar', 'Chennai', 13.0418, 80.2341, 8),
('Volt Point Station', 'IT Corridor, OMR', 'Chennai', 12.9010, 80.2279, 5),
('Charge & Go Hub', 'Velachery Main Road', 'Chennai', 12.9830, 80.2209, 3);

INSERT INTO chargers (station_id, charger_type, charger_number, power_output, status) VALUES
(1, 'FAST', 'F-101', 50.00, 'ACTIVE'),
(1, 'FAST', 'F-102', 50.00, 'ACTIVE'),
(1, 'NORMAL', 'N-101', 22.00, 'ACTIVE'),
(1, 'NORMAL', 'N-102', 22.00, 'ACTIVE'),
(1, 'SUPER', 'S-101', 150.00, 'ACTIVE'),
(1, 'SUPER', 'S-102', 150.00, 'ACTIVE'),
(2, 'FAST', 'F-201', 50.00, 'ACTIVE'),
(2, 'FAST', 'F-202', 50.00, 'ACTIVE'),
(2, 'NORMAL', 'N-201', 22.00, 'ACTIVE'),
(2, 'SUPER', 'S-201', 150.00, 'ACTIVE'),
(3, 'FAST', 'F-301', 50.00, 'ACTIVE'),
(3, 'NORMAL', 'N-301', 22.00, 'ACTIVE'),
(3, 'SUPER', 'S-301', 150.00, 'ACTIVE');

INSERT INTO slots (charger_id, station_id, slot_number, slot_state) VALUES
(1, 1, 'F101-S1', 'AVAILABLE'), (1, 1, 'F101-S2', 'AVAILABLE'),
(2, 1, 'F102-S1', 'AVAILABLE'), (2, 1, 'F102-S2', 'AVAILABLE'),
(3, 1, 'N101-S1', 'AVAILABLE'), (3, 1, 'N101-S2', 'AVAILABLE'),
(4, 1, 'N102-S1', 'AVAILABLE'), (4, 1, 'N102-S2', 'AVAILABLE'),
(5, 1, 'S101-S1', 'AVAILABLE'), (5, 1, 'S101-S2', 'AVAILABLE'),
(6, 1, 'S102-S1', 'AVAILABLE'), (6, 1, 'S102-S2', 'AVAILABLE'),
(7, 2, 'F201-S1', 'AVAILABLE'), (7, 2, 'F201-S2', 'AVAILABLE'),
(8, 2, 'F202-S1', 'AVAILABLE'), (8, 2, 'F202-S2', 'AVAILABLE'),
(9, 2, 'N201-S1', 'AVAILABLE'), (9, 2, 'N201-S2', 'AVAILABLE'),
(10, 2, 'S201-S1', 'AVAILABLE'), (10, 2, 'S201-S2', 'AVAILABLE'),
(11, 3, 'F301-S1', 'AVAILABLE'), (11, 3, 'F301-S2', 'AVAILABLE'),
(12, 3, 'N301-S1', 'AVAILABLE'), (12, 3, 'N301-S2', 'AVAILABLE'),
(13, 3, 'S301-S1', 'AVAILABLE'), (13, 3, 'S301-S2', 'AVAILABLE');
