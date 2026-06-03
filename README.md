# ⚒️ IRONnetWORK — The Network Forged in Steel

## Full-Stack MVP — Real App with Database & Auth

### Quick Start
```bash
cd ironnetwork
npm install
node server.js
```
Then open **http://localhost:3000** in your browser.

### What's Built

**4 Core Features (Day-1 MVP):**

| Feature | What It Does |
|---------|-------------|
| 🔩 **Tradesman Card** | Sign up with phone, pick trade, auto-rank, upload avatar, add certs |
| ⚒️ **Locals** | 9 pre-seeded trade communities. Auto-join on signup. Browse, join, post. |
| 🏠 **The Yard** | Feed showing posts from your Locals. Drop photos + text. Give props. |
| 💬 **Messages** | Real-time DMs. View conversations, send/receive messages. |

**Bonus Features:**
- 🤝 **Vouch System** — Visit anyone's card, vouch for specific traits
- 🏅 **Certifications** — Add/manage your certs on your card
- 🟢 **Rank Badges** — Auto-calculated: Apprentice → Journeyman → Foreman → Legend
- 📸 **Photo Uploads** — Attach images to posts and avatar
- 🔍 **User Discovery** — Find other workers in Messages

### Tech Stack
- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3) — zero config, file-based, portable
- **Auth:** bcrypt password hashing, token-based sessions
- **Frontend:** Vanilla JS SPA — zero dependencies, instant load
- **File uploads:** Multer
- **Runs anywhere:** No Docker, no cloud config needed

### API Endpoints (15)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/signup | No | Create account |
| POST | /api/login | No | Log in |
| GET | /api/me | Yes | Get my profile |
| PUT | /api/me | Yes | Update profile |
| POST | /api/me/avatar | Yes | Upload avatar |
| GET | /api/users | Yes | Search users |
| GET | /api/users/:id | No | View user card |
| GET | /api/locals | Yes | List all Locals |
| POST | /api/locals/:id/join | Yes | Join a Local |
| DELETE | /api/locals/:id/leave | Yes | Leave a Local |
| GET | /api/posts | Yes | Get Yard/Local feed |
| POST | /api/posts | Yes | Create post (+ image) |
| POST | /api/posts/:id/props | Yes | Toggle props 🔥 |
| DELETE | /api/posts/:id | Yes | Delete own post |
| GET | /api/messages/conversations | Yes | List conversations |
| GET | /api/messages/:userId | Yes | Get chat messages |
| POST | /api/messages | Yes | Send message |
| GET | /api/users/:id/vouches | No | Get vouch counts |
| POST | /api/users/:id/vouch | Yes | Vouch for someone |
| GET | /api/me/certs | Yes | My certifications |
| POST | /api/me/certs | Yes | Add certification |
| DELETE | /api/me/certs/:id | Yes | Remove certification |

### Database
SQLite file at `ironnetwork.db` — created automatically on first run.
Tables: users, locals, local_members, posts, props, messages, vouches, certs.

### Default Locals (Pre-seeded)
🔥 Welders · ⚡ Electricians · 🔩 Ironworkers · 🔧 Plumbers · 🪚 Carpenters · ❄️ HVAC · 🏗️ Operators · 🛡️ Safety First · 🏠 General

### Next Steps
1. Deploy to Railway/Render/Fly.io (free tier)
2. Add real SMS verification (Twilio)
3. Add push notifications
4. Convert to React Native for app stores
