# DropClock — Real-Time Ticket Drop Radar & Schedule Differential Monitor

[![Live Application](https://img.shields.io/badge/Live_App-wholedropreminder.vercel.app-e11d48?style=for-the-badge&logo=vercel)](https://wholedropreminder.vercel.app)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](https://opensource.org/licenses/MIT)

**DropClock** is a high-throughput, real-time ticket availability monitor and schedule differential detector for multiplex ticketing platforms (BookMyShow). Engineered to monitor silently opened auditoriums, newly scheduled showtimes, and high-demand cinematic booking drops with sub-minute alert latency and direct deep-links to seat layouts.

- **Production Deployment:** [https://wholedropreminder.vercel.app](https://wholedropreminder.vercel.app)
- **Repository:** [https://github.com/breadoldest-collab/dropclock.git](https://github.com/breadoldest-collab/dropclock.git)

---

## 1. Overview

Multiplex cinema chains and ticketing aggregators frequently open booking windows incrementally:
- Initial booking windows often expose limited auditoriums or low-demand formats.
- High-demand auditoriums (such as large-format screens, laser projection suites, and early-morning/midnight shows) are added unpredictably hours or days later.
- High-occupancy formats sell out within minutes of schedule modification, rendering standard email notifications ineffective.

Dropclock operates as a persistent daemon that snapshots published auditorium schedules, computes set differentials at high frequency, and dispatches immediate notifications over SMS and WhatsApp webhooks the second new showtimes are registered.

---

## 2. Core Architecture

```
[ BookMyShow Endpoints ]
           |
           v (Every 30 Seconds)
+-----------------------+
|  BMS Scraper Engine   | ---> Extracts DOM showtime pills & window.__NEXT_DATA__
+-----------------------+
           |
           v
+-----------------------+
| Showtime Diff Engine  | ---> Computes: Delta = CurrentSchedules \ KnownBaseline
+-----------------------+
           |
     [ Delta > 0? ]
      /          \
    (Yes)        (No)
     /             \
    v               v
+-----------------------+   +-------------------+
| Notification Service  |   | Sleep until next  |
| - Twilio SMS          |   | polling interval  |
| - WhatsApp API        |   +-------------------+
+-----------------------+
           |
           v
[ User Mobile Device ]
(Direct Deep-Link to Seat Layout)
```

### Key Components

- **Schedule Differential Engine**: Maintains an indexed baseline of active showtimes per cinema and date. Incoming payloads are normalized and evaluated against known states using set difference algorithms.
- **Adaptive Polling Daemon**: Dynamically adjusts polling frequency based on release urgency (Cold: 30 minutes, Warm: 3 minutes, Hot: 30 seconds).
- **Multi-Channel Dispatcher**: Formats and transmits high-priority payloads containing cinema name, screening format, newly registered timeslots, and direct deep-links targeting the platform's seat selection matrix.
- **Web Interface**: Neo-Brutalist dashboard built with React, Vite, and Tailwind CSS, allowing zero-friction tracking via direct URL injection or manual multiplex selection.

---

## 3. Technology Stack

### Backend
- Runtime: Node.js (ES Modules)
- Framework: Express.js
- Persistence: MongoDB / Mongoose (MongoDB Atlas compatible)
- In-Memory Fallback: MongoMemoryServer (Zero-config local development)
- Extraction & Ingestion: Axios, Cheerio, User-Agents rotation
- Notifications: Twilio REST API (SMS & WhatsApp), Node Telegram Bot API

### Frontend
- Build Tool: Vite
- Library: React 18
- Routing: React Router 6
- Styling: Tailwind CSS (Custom Neo-Brutalist design tokens, 0-blur hard shadows, custom print palette)
- HTTP Client: Axios

---

## 4. Differential Detection Engine

When a cinema URL or identifier is submitted for monitoring:

1. **Baseline Capture**: The engine queries the target cinema URL and extracts all active showtimes:
   ```json
   {
     "theatre": "Prasads Multiplex: Hyderabad",
     "date": "20261217",
     "knownShows": ["09:00 AM", "11:05 AM", "02:10 PM", "05:15 PM", "08:20 PM", "11:25 PM"]
   }
   ```

2. **Continuous Extraction**: The daemon inspects both rendered DOM pill elements and embedded JSON payloads (`window.__NEXT_DATA__` and `window.__INITIAL_STATE__`).

3. **Set Difference Evaluation**:
   ```javascript
   const newlyAddedShows = currentShows.filter(show => !knownShows.includes(show));
   if (newlyAddedShows.length > 0) {
     triggerImmediateAlert(newlyAddedShows);
     updateKnownBaseline(currentShows);
   }
   ```

4. **Payload Dispatch**: Dispatches an alert containing only the newly introduced showtimes, preventing redundant notifications for previously known slots.

---

## 5. Repository Structure

```
dropclock/
|-- backend/
|   |-- src/
|   |   |-- config/
|   |   |   `-- database.js             # Mongoose connection & in-memory fallback
|   |   |-- models/
|   |   |   `-- Alert.js                # Schema definition for monitored trackers
|   |   |-- routes/
|   |   |   |-- alerts.js               # REST endpoints for tracker lifecycle
|   |   |   `-- telegramBot.js          # Telegram bot command processor
|   |   |-- scripts/
|   |   |   `-- testSimulation.js       # End-to-end differential test suite
|   |   |-- services/
|   |   |   |-- bmsService.js           # Platform scraper & DOM parser
|   |   |   |-- notificationService.js  # SMS, WhatsApp, and Telegram dispatchers
|   |   |   `-- pollingService.js       # Background scheduler and diff evaluator
|   |   `-- server.js                   # Application entry point
|   |-- .env.example                    # Environment variable schema
|   |-- package.json
|   `-- render.yaml                     # Render deployment blueprint
|
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |   `-- client.js               # Dynamic Axios client instance
|   |   |-- components/
|   |   |   `-- Navbar.jsx              # Application navigation bar
|   |   |-- pages/
|   |   |   |-- Dashboard.jsx           # Active telemetry and tracker list
|   |   |   |-- Home.jsx                # Landing page and system overview
|   |   |   `-- SetAlert.jsx            # Tracker registration wizard
|   |   |-- App.jsx                     # Root application routing and ticker
|   |   |-- index.css                   # Global styles and typography rules
|   |   `-- main.jsx                    # React runtime bootstrap
|   |-- index.html
|   |-- package.json
|   |-- tailwind.config.js              # Custom theme tokens
|   |-- vercel.json                     # Vercel SPA routing configuration
|   `-- vite.config.js                  # Vite server and reverse proxy setup
|
|-- .gitignore
`-- README.md
```

---

## 6. Installation and Local Setup

### Prerequisites
- Node.js version 18.0.0 or higher
- npm version 9.0.0 or higher
- Git version 2.30.0 or higher
- Access to a MongoDB instance (local or MongoDB Atlas connection URI)

### Clone Repository
```bash
git clone https://github.com/breadoldest-collab/dropclock.git
cd dropclock
```

### Backend Configuration
```bash
cd backend
npm install
cp .env.example .env
```

Configure your environment variables in `backend/.env`:
```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/bms-notifier?retryWrites=true&w=majority

# Optional: Twilio SMS & WhatsApp integration
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Optional: Telegram Bot integration
TELEGRAM_BOT_TOKEN=
```

Start the backend service:
```bash
npm run dev
```

### Frontend Configuration
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` to access the interface.

---

## 7. Automated Differential Simulation

To verify the scraping, diffing, and dispatch pipeline without waiting for a live BookMyShow schedule change:

```bash
cd backend
npm run test:sim
```

The test runner initializes a baseline of six shows at Prasads Multiplex, simulates a sudden schedule injection of early-morning and midnight screenings, verifies differential detection, and logs the formatted dispatch payloads.

---

## 8. Deployment Specifications

### Backend (Render / Railway / AWS EC2)
- Build Command: `npm install`
- Start Command: `node src/server.js`
- Required Environment Variables:
  - `MONGODB_URI`: Valid MongoDB connection string.
  - `PORT`: Target port (defaults to 3000).
- Network Configuration: Ensure MongoDB Atlas IP Access List permits connections from `0.0.0.0/0` or the hosting provider's egress CIDR block.

### Frontend (Vercel / Cloudflare Pages)
- Framework Preset: Vite
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:
  - `VITE_API_URL`: Public HTTPS URL of the deployed backend service (e.g., `https://api.dropclock.example.com`).

---

## 9. API Reference

### Create Tracker
```http
POST /api/alerts
Content-Type: application/json

{
  "bmsUrl": "https://in.bookmyshow.com/cinemas/HYD/prasads-multiplex-hyderabad/buytickets/PRHN/20261217",
  "movieName": "",
  "theatreName": "Prasads Multiplex: Hyderabad",
  "city": "hyderabad",
  "targetDate": "17 Dec 2026",
  "phoneNumber": "9876543210",
  "notificationMethod": "whatsapp",
  "watchType": "new_shows"
}
```

### List Trackers
```http
GET /api/alerts
```

### Manually Escalate Polling Frequency
```http
PATCH /api/alerts/:id/escalate
Content-Type: application/json

{
  "phase": "hot"
}
```

### Remove Tracker
```http
DELETE /api/alerts/:id
```

### System Health & Telemetry
```http
GET /api/alerts/stats/overview
```

---

## 10. Operational Guidelines

1. **Rate Limiting**: Automated polling adheres to conservative intervals to maintain platform stability. Direct high-frequency querying is restricted to active "Hot" phases.
2. **Data Usage**: Dropclock monitors publicly accessible schedule metadata strictly for real-time alerting. It does not automate seat reservation, cart holding, or payment processing.
3. **Resilience**: The backend incorporates graceful degradation; if remote database access is interrupted during local development, an in-memory replica automatically instantiates.

---

## 11. License

Distributed under the MIT License. Open-source software intended for community utility and educational analysis of distributed scheduling architectures.
