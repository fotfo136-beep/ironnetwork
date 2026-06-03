const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════
// DATABASE SETUP
// ═══════════════════════════════════════
const db = new Database(path.join(__dirname, 'ironnetwork.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    trade TEXT NOT NULL,
    location TEXT DEFAULT '',
    years TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    rank TEXT DEFAULT 'apprentice',
    available INTEGER DEFAULT 1,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS locals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '⚒️',
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS local_members (
    user_id TEXT NOT NULL,
    local_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, local_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (local_id) REFERENCES locals(id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    local_id TEXT,
    content TEXT NOT NULL,
    image TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (local_id) REFERENCES locals(id)
  );

  CREATE TABLE IF NOT EXISTS props (
    user_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_id) REFERENCES users(id),
    FOREIGN KEY (to_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS vouches (
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (from_id, to_id, category),
    FOREIGN KEY (from_id) REFERENCES users(id),
    FOREIGN KEY (to_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS certs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    expires TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed default Locals
const seedLocals = [
  { id: 'welders', name: 'Welders Local', emoji: '🔥', description: 'TIG, MIG, Stick & everything in between' },
  { id: 'electricians', name: 'Electricians Local', emoji: '⚡', description: 'Code talk, panels, data centers' },
  { id: 'ironworkers', name: 'Ironworkers Local', emoji: '🔩', description: 'Structural steel, rebar, ornamental' },
  { id: 'plumbers', name: 'Plumbers Local', emoji: '🔧', description: 'Copper, PEX, cast iron' },
  { id: 'carpenters', name: 'Carpenters Local', emoji: '🪚', description: 'Framing, finish, cabinetry' },
  { id: 'hvac', name: 'HVAC Local', emoji: '❄️', description: 'Heating, cooling, ventilation' },
  { id: 'operators', name: 'Operators Local', emoji: '🏗️', description: 'Cranes, excavators, heavy equipment' },
  { id: 'safety', name: 'Safety First', emoji: '🛡️', description: 'OSHA updates, toolbox talks, PPE' },
  { id: 'general', name: 'The Yard — General', emoji: '🏠', description: 'Open talk for all trades' },
];
const insertLocal = db.prepare('INSERT OR IGNORE INTO locals (id, name, emoji, description) VALUES (?, ?, ?, ?)');
seedLocals.forEach(l => insertLocal.run(l.id, l.name, l.emoji, l.description));

// Map trades to default local
const tradeLocalMap = {
  'Welder': 'welders', 'Electrician': 'electricians', 'Ironworker': 'ironworkers',
  'Plumber': 'plumbers', 'Carpenter': 'carpenters', 'HVAC': 'hvac',
  'Operator': 'operators', 'Mason': 'general'
};

// ═══════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
  filename: (req, file, cb) => cb(null, uuid() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Simple session (cookie-based token)
function auth(req, res, next) {
  const token = req.headers['x-token'];
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(token);
  if (!user) return res.status(401).json({ error: 'Invalid session' });
  req.user = user;
  next();
}

// ═══════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════
app.post('/api/signup', (req, res) => {
  const { phone, name, trade, location, years, password } = req.body;
  if (!phone || !name || !trade || !password) return res.status(400).json({ error: 'Missing fields' });

  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (existing) return res.status(400).json({ error: 'Phone already registered' });

  const id = uuid();
  const hash = bcrypt.hashSync(password, 10);
  const rank = getRank(years);

  db.prepare('INSERT INTO users (id, phone, name, trade, location, years, password, rank) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, phone, name, trade, location || '', years || '', hash, rank);

  // Auto-join matching Local + general
  const localId = tradeLocalMap[trade] || 'general';
  db.prepare('INSERT OR IGNORE INTO local_members (user_id, local_id) VALUES (?, ?)').run(id, localId);
  db.prepare('INSERT OR IGNORE INTO local_members (user_id, local_id) VALUES (?, ?)').run(id, 'general');

  res.json({ token: id, user: getPublicUser(id) });
});

app.post('/api/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Missing fields' });

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Wrong phone or password' });
  }
  res.json({ token: user.id, user: getPublicUser(user.id) });
});

// ═══════════════════════════════════════
// USER / CARD ROUTES
// ═══════════════════════════════════════
app.get('/api/me', auth, (req, res) => {
  res.json(getPublicUser(req.user.id));
});

app.put('/api/me', auth, (req, res) => {
  const { name, trade, location, years, bio, available } = req.body;
  const u = req.user;
  db.prepare('UPDATE users SET name=?, trade=?, location=?, years=?, bio=?, available=?, rank=? WHERE id=?')
    .run(name || u.name, trade || u.trade, location || u.location, years || u.years, bio || u.bio,
         available !== undefined ? available : u.available, getRank(years || u.years), u.id);
  res.json(getPublicUser(u.id));
});

app.post('/api/me/avatar', auth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run('/uploads/' + req.file.filename, req.user.id);
  res.json({ avatar: '/uploads/' + req.file.filename });
});

app.get('/api/users/:id', (req, res) => {
  const user = getPublicUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

app.get('/api/users', auth, (req, res) => {
  const q = req.query.q || '';
  const trade = req.query.trade || '';
  let users;
  if (q) {
    users = db.prepare("SELECT id FROM users WHERE name LIKE ? AND id != ? LIMIT 30").all('%' + q + '%', req.user.id);
  } else if (trade) {
    users = db.prepare("SELECT id FROM users WHERE trade = ? AND id != ? LIMIT 30").all(trade, req.user.id);
  } else {
    users = db.prepare("SELECT id FROM users WHERE id != ? ORDER BY created_at DESC LIMIT 30").all(req.user.id);
  }
  res.json(users.map(u => getPublicUser(u.id)));
});

// ═══════════════════════════════════════
// LOCALS ROUTES
// ═══════════════════════════════════════
app.get('/api/locals', auth, (req, res) => {
  const locals = db.prepare('SELECT * FROM locals ORDER BY name').all();
  const result = locals.map(l => {
    const count = db.prepare('SELECT COUNT(*) as c FROM local_members WHERE local_id = ?').get(l.id).c;
    const isMember = db.prepare('SELECT 1 FROM local_members WHERE user_id = ? AND local_id = ?').get(req.user.id, l.id);
    return { ...l, members: count, joined: !!isMember };
  });
  res.json(result);
});

app.post('/api/locals/:id/join', auth, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO local_members (user_id, local_id) VALUES (?, ?)').run(req.user.id, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/locals/:id/leave', auth, (req, res) => {
  db.prepare('DELETE FROM local_members WHERE user_id = ? AND local_id = ?').run(req.user.id, req.params.id);
  res.json({ ok: true });
});

// ═══════════════════════════════════════
// POSTS (THE YARD) ROUTES
// ═══════════════════════════════════════
app.get('/api/posts', auth, (req, res) => {
  const localId = req.query.local;
  let posts;
  if (localId) {
    posts = db.prepare(`SELECT p.*, u.name as user_name, u.trade as user_trade, u.avatar as user_avatar, u.rank as user_rank,
      l.name as local_name, l.emoji as local_emoji
      FROM posts p JOIN users u ON p.user_id = u.id LEFT JOIN locals l ON p.local_id = l.id
      WHERE p.local_id = ? ORDER BY p.created_at DESC LIMIT 50`).all(localId);
  } else {
    // The Yard: posts from user's locals
    posts = db.prepare(`SELECT p.*, u.name as user_name, u.trade as user_trade, u.avatar as user_avatar, u.rank as user_rank,
      l.name as local_name, l.emoji as local_emoji
      FROM posts p JOIN users u ON p.user_id = u.id LEFT JOIN locals l ON p.local_id = l.id
      WHERE p.local_id IN (SELECT local_id FROM local_members WHERE user_id = ?) OR p.user_id = ?
      ORDER BY p.created_at DESC LIMIT 50`).all(req.user.id, req.user.id);
  }
  // Add props count + user propped
  posts.forEach(p => {
    p.props_count = db.prepare('SELECT COUNT(*) as c FROM props WHERE post_id = ?').get(p.id).c;
    p.user_propped = !!db.prepare('SELECT 1 FROM props WHERE user_id = ? AND post_id = ?').get(req.user.id, p.id);
  });
  res.json(posts);
});

app.post('/api/posts', auth, upload.single('image'), (req, res) => {
  const { content, local_id } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const id = uuid();
  const image = req.file ? '/uploads/' + req.file.filename : '';
  db.prepare('INSERT INTO posts (id, user_id, local_id, content, image) VALUES (?,?,?,?,?)')
    .run(id, req.user.id, local_id || null, content, image);
  res.json({ id });
});

app.post('/api/posts/:id/props', auth, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM props WHERE user_id = ? AND post_id = ?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM props WHERE user_id = ? AND post_id = ?').run(req.user.id, req.params.id);
    res.json({ propped: false });
  } else {
    db.prepare('INSERT INTO props (user_id, post_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    res.json({ propped: true });
  }
});

app.delete('/api/posts/:id', auth, (req, res) => {
  db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  db.prepare('DELETE FROM props WHERE post_id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ═══════════════════════════════════════
// MESSAGES ROUTES
// ═══════════════════════════════════════
app.get('/api/messages/conversations', auth, (req, res) => {
  const convos = db.prepare(`
    SELECT DISTINCT
      CASE WHEN from_id = ? THEN to_id ELSE from_id END as other_id
    FROM messages WHERE from_id = ? OR to_id = ?
  `).all(req.user.id, req.user.id, req.user.id);

  const result = convos.map(c => {
    const other = getPublicUser(c.other_id);
    const last = db.prepare(`SELECT * FROM messages
      WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
      ORDER BY created_at DESC LIMIT 1`).get(req.user.id, c.other_id, c.other_id, req.user.id);
    const unread = db.prepare('SELECT COUNT(*) as c FROM messages WHERE from_id = ? AND to_id = ? AND read = 0')
      .get(c.other_id, req.user.id).c;
    return { other, last_message: last, unread };
  });
  result.sort((a, b) => new Date(b.last_message?.created_at || 0) - new Date(a.last_message?.created_at || 0));
  res.json(result);
});

app.get('/api/messages/:userId', auth, (req, res) => {
  const msgs = db.prepare(`SELECT * FROM messages
    WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
    ORDER BY created_at ASC LIMIT 100`)
    .all(req.user.id, req.params.userId, req.params.userId, req.user.id);
  // Mark as read
  db.prepare('UPDATE messages SET read = 1 WHERE from_id = ? AND to_id = ?').run(req.params.userId, req.user.id);
  res.json(msgs);
});

app.post('/api/messages', auth, (req, res) => {
  const { to_id, content } = req.body;
  if (!to_id || !content) return res.status(400).json({ error: 'Missing fields' });
  const id = uuid();
  db.prepare('INSERT INTO messages (id, from_id, to_id, content) VALUES (?,?,?,?)').run(id, req.user.id, to_id, content);
  res.json({ id });
});

// ═══════════════════════════════════════
// VOUCHES ROUTES
// ═══════════════════════════════════════
app.get('/api/users/:id/vouches', (req, res) => {
  const vouches = db.prepare(`SELECT category, COUNT(*) as count FROM vouches WHERE to_id = ? GROUP BY category`).all(req.params.id);
  const total = db.prepare('SELECT COUNT(DISTINCT from_id) as c FROM vouches WHERE to_id = ?').get(req.params.id).c;
  res.json({ vouches, total });
});

app.post('/api/users/:id/vouch', auth, (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Category required' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: "Can't vouch for yourself" });
  db.prepare('INSERT OR IGNORE INTO vouches (from_id, to_id, category) VALUES (?,?,?)').run(req.user.id, req.params.id, category);
  res.json({ ok: true });
});

// ═══════════════════════════════════════
// CERTS ROUTES
// ═══════════════════════════════════════
app.get('/api/me/certs', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM certs WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id));
});

app.post('/api/me/certs', auth, (req, res) => {
  const { name, expires } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uuid();
  db.prepare('INSERT INTO certs (id, user_id, name, expires) VALUES (?,?,?,?)').run(id, req.user.id, name, expires || '');
  res.json({ id });
});

app.delete('/api/me/certs/:id', auth, (req, res) => {
  db.prepare('DELETE FROM certs WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function getPublicUser(id) {
  const u = db.prepare('SELECT id, phone, name, trade, location, years, bio, avatar, rank, available, created_at FROM users WHERE id = ?').get(id);
  if (!u) return null;
  const vouches = db.prepare('SELECT COUNT(DISTINCT from_id) as c FROM vouches WHERE to_id = ?').get(id).c;
  const posts = db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id = ?').get(id).c;
  const locals = db.prepare(`SELECT l.* FROM locals l JOIN local_members lm ON l.id = lm.local_id WHERE lm.user_id = ?`).all(id);
  const certs = db.prepare('SELECT * FROM certs WHERE user_id = ?').all(id);
  return { ...u, vouches, posts_count: posts, locals, certs };
}

function getRank(years) {
  if (!years) return 'apprentice';
  const y = years.toLowerCase().replace(/\s+/g, '');
  if (y.includes('20+')) return 'legend';
  if (y.includes('10-20')) return 'foreman';
  if (y.includes('5-10') || y.includes('3-5')) return 'journeyman';
  if (y.includes('1-3')) return 'apprentice';
  return 'apprentice';
}

// SPA fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n⚒️  IRONnetWORK server running at http://localhost:${PORT}\n`);
});
