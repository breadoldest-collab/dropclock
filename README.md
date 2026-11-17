# 🎬 Movie Ticket Alarm Clock

> **Never miss a blockbuster booking again.**

Pick your movie. Pick your theatre. We watch BookMyShow 24/7 so you don't have to. The second bookings go live, your phone buzzes with a direct link to grab the best seats.

**Free & Open Source** — Made for the movie-loving community.

---

## How It Works

```
You pick:    "Watch Avengers: Doomsday at PVR Nexus, Hyderabad"
                              ↓
We watch:    Polls BMS every 30s-30min (smart 3-phase system)
                              ↓
We alert:    📱 Instant Telegram message + direct BMS booking link
                              ↓
You book:    Tap → Seat selection → Best seats secured! 🎉
```

## Smart Polling (3 Phases)

| Phase | Interval | When |
|-------|----------|------|
| 🧊 **COLD** | Every 30 min | Movie announced, no booking date known |
| 🔥 **WARM** | Every 3 min | Other cities/theatres opening up |
| ⚡ **HOT** | Every 30 sec | Bookings detected nearby, yours is imminent |

When bookings open at *any* theatre for a movie, all alerts for that movie auto-escalate to HOT.

---

## Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/movie-ticket-alarm-clock.git
cd movie-ticket-alarm-clock

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and Telegram bot token

# Frontend
cd ../frontend
npm install
```

### 2. Set Up Telegram Bot

1. Open Telegram, search for **@BotFather**
2. Send `/newbot` and follow the prompts
3. Copy the bot token to `backend/.env`
4. Start a chat with your bot and send `/start`

### 3. Run

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm run dev
```

---

## Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/watch MovieName` | Start setting up an alert |
| `/setalert Movie \| city \| Theatre` | Create an alert |
| `/alerts` | List your active alerts |
| `/status` | Dashboard overview |
| `/escalate <id>` | Switch to HOT mode (30s checks) |
| `/cancel <id>` | Cancel an alert |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Polling Engine | Custom smart poller with 3-phase system |
| Scraping | Axios + Cheerio (HTML parsing) |
| Notifications | Telegram Bot API |
| Frontend | React + Vite + Tailwind CSS |
| Animations | Framer Motion |

---

## Project Structure

```
movie_ticket_alarm_clock/
├── backend/
│   ├── src/
│   │   ├── server.js              # Main entry point
│   │   ├── config/
│   │   │   └── database.js        # MongoDB connection
│   │   ├── models/
│   │   │   └── Alert.js           # Alert schema
│   │   ├── services/
│   │   │   ├── bmsService.js      # 🔑 BMS API/scraping engine
│   │   │   ├── pollingService.js  # 🔑 Smart 3-phase poller
│   │   │   └── notificationService.js  # Telegram notifications
│   │   └── routes/
│   │       ├── alerts.js          # REST API for alerts
│   │       └── telegramBot.js     # Telegram command handler
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Landing page
│   │   │   ├── SetAlert.jsx       # Alert creation wizard
│   │   │   └── Dashboard.jsx      # Alert management
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
└── README.md
```

---

## Disclaimer

This tool checks publicly available information on BookMyShow for personal, non-commercial use. It is not affiliated with or endorsed by BookMyShow. Use responsibly.

---

## Contributing

This is a community project. PRs welcome! If BMS changes their page structure (they will), help us fix the scraper.

## License

MIT — Free forever. 🎬

