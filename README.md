# Smart EV Charging Optimization System

## Tech Stack
- **Frontend**: React.js 18, React Router 6, Recharts, Axios
- **Backend**: Spring Boot 3.2, Spring Security, JWT, JPA/Hibernate
- **Database**: MySQL 8

---

## Setup Instructions

### 1. Database Setup
```sql
-- Run in MySQL Workbench or CLI
source database/schema.sql
```
Use the administrator account configured for your local environment. Do not commit credentials to version control.

### 2. Backend Setup
```bash
cd ev-charging-backend

# Edit src/main/resources/application.properties
# Set your MySQL username/password

mvn spring-boot:run
# Runs on http://localhost:8080
```

### 3. Frontend Setup
```bash
cd ev-charging-frontend
npm install
npm start
# Runs on http://localhost:3000
```

---

## Default Login Credentials

| Role    | Email                     | Password |
|---------|---------------------------|----------|

| Manager | (Create via Admin panel)  | —        |
| User    | (Register via Signup)     | —        |

---

## Project Structure

```
EV PROJECT/
â”œâ”€â”€ database/
â”‚   â””â”€â”€ schema.sql                    â† MySQL schema + seed data
â”‚
â”œâ”€â”€ ev-charging-backend/              â† Spring Boot
â”‚   â””â”€â”€ src/main/java/com/evcharging/
â”‚       â”œâ”€â”€ model/                    â† JPA Entities
â”‚       â”‚   â”œâ”€â”€ User.java
â”‚       â”‚   â”œâ”€â”€ Station.java
â”‚       â”‚   â”œâ”€â”€ Charger.java
â”‚       â”‚   â”œâ”€â”€ Slot.java
â”‚       â”‚   â”œâ”€â”€ Booking.java
â”‚       â”‚   â””â”€â”€ Notification.java
â”‚       â”œâ”€â”€ repository/               â† Spring Data JPA
â”‚       â”œâ”€â”€ service/                  â† Business Logic
â”‚       â”œâ”€â”€ controller/               â† REST Controllers
â”‚       â”œâ”€â”€ dto/                      â† Request/Response DTOs
â”‚       â”œâ”€â”€ security/                 â† JWT Auth
â”‚       â”œâ”€â”€ config/                   â† Security + CORS Config
â”‚       â””â”€â”€ pattern/                  â† Design Patterns
â”‚           â”œâ”€â”€ factory/              â† Charger Factory
â”‚           â”œâ”€â”€ observer/             â† Booking Events â†’ Notifications
â”‚           â”œâ”€â”€ state/                â† Slot State Machine
â”‚           â””â”€â”€ strategy/             â† Slot Allocation
â”‚
â””â”€â”€ ev-charging-frontend/             â† React
    â””â”€â”€ src/
        â”œâ”€â”€ pages/
        â”‚   â”œâ”€â”€ auth/                 â† Landing, Login, Register
        â”‚   â”œâ”€â”€ user/                 â† User Dashboard + Booking
        â”‚   â”œâ”€â”€ manager/              â† Station Manager Dashboard
        â”‚   â””â”€â”€ admin/                â† Admin Dashboard
        â”œâ”€â”€ services/api.js           â† Axios + JWT interceptors
        â”œâ”€â”€ context/AuthContext.js    â† Auth state
        â””â”€â”€ styles/global.css         â† Full design system
```

---

## API Endpoints

| Module  | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| Auth    | /api/auth/login | POST | Login |
| Auth    | /api/auth/register | POST | Register user |
| User    | /api/user/stations/nearby?lat=&lng= | GET | Nearby stations |
| User    | /api/user/stations/city?city= | GET | Stations by city |
| User    | /api/user/stations/:id/chargers | GET | Station chargers + slots |
| User    | /api/user/bookings | POST | Create booking |
| User    | /api/user/bookings | GET | My bookings |
| User    | /api/user/notifications | GET | My notifications |
| Manager | /api/manager/station | GET | My station |
| Manager | /api/manager/chargers | POST | Add charger |
| Manager | /api/manager/chargers/:id/maintenance | PUT | Toggle maintenance |
| Manager | /api/manager/slots/:id/state | PUT | Change slot state |
| Manager | /api/manager/bookings/:id/status | PUT | Advance booking |
| Admin   | /api/admin/analytics | GET | Platform stats |
| Admin   | /api/admin/stations | GET/POST | Manage stations |
| Admin   | /api/admin/managers | GET/POST | Manage managers |
| Admin   | /api/admin/users | GET | All users |
| Admin   | /api/admin/bookings | GET | All bookings |

---

## Design Patterns

| Pattern   | Implementation | Where |
|-----------|---------------|-------|
| Factory   | ChargerFactory | Creates Fast/Normal/Super charger configs |
| Observer  | BookingEventPublisher | Fires notifications on booking events |
| State     | SlotStateManager | Enforces valid slot state transitions |
| Strategy  | SlotAllocationStrategy | FIFO / Smart slot allocation |
| Singleton | Spring Beans (default) | All @Service/@Component classes |
