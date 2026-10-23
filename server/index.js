import './config/env.js';
import express         from 'express';
import cors            from 'cors';
import mongoose        from 'mongoose';
import authRoutes       from './routes/auth.js';
import complaintRoutes  from './routes/complaints.js';
import departmentRoutes from './routes/departments.js';
import aiRoutes         from './routes/ai.js';

const app   = express();
const PORT  = process.env.PORT       || 3001;
const MONGO = process.env.MONGO_URI  || 'mongodb://127.0.0.1:27017/civicsense';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin:  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));
app.use(express.json({ limit: '5mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/complaints',  complaintRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/ai',          aiRoutes);

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

app.get('/', (_req, res) => {
  res.json({
    service: 'CivicSense API',
    ok: true,
    health: '/api/health',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok:  true,
    db:  mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    ai:  AI_URL,
    ts:  Date.now(),
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[API Error]', err.message);
  const status = err.name === 'ValidationError' ? 400 : 500;
  res.status(status).json({ error: err.message });
});

// ── Connect → Listen ──────────────────────────────────────────────────────────
mongoose
  .connect(MONGO)
  .then(() => {
    console.log(`✔  MongoDB connected  → ${mongoose.connection.host}/${mongoose.connection.name}`);
    app.listen(PORT, () =>
      console.log(`✔  CivicSense API     → http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error('✖  MongoDB connection failed:', err.message);
    process.exit(1);
  });
