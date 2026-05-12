require('dotenv').config();
const cron = require('node-cron');
//require("./utils/reminderScheduler"); // ⬅️ Add this line
const sendReminders = require('./utils/sendReminders');

cron.schedule('*/15 * * * *', async () => {
  console.log('⏱️ Checking for 24-hour reminders...');
  await sendReminders();
});

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const app = express();
/* ──────────────────────────  MIDDLEWARE  ────────────────────────── */

// ✅ Allow requests from local and deployed frontend (Vercel)
app.use(
  cors({
    origin: [
      'http://localhost:5173',           // Local frontend
      'https://cure-buddy-sakshi.vercel.app',   // Deployed frontend on Vercel
    ],
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

// ✅ Serve uploaded images/docs with proper CORS headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  },
}));

/* ──────────────────────────  DATABASE  ─────────────────────────── */

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Error:', err));

/* ────────────────────────────  ROUTES  ─────────────────────────── */

// Core route files
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointments');

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);

// Health check
app.get('/', (_req, res) => res.send('✅ CureBuddy API is running...'));

/* ──────────────────────────  START SERVER  ─────────────────────── */
console.log(__dirname);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at: http://localhost:${PORT}`)
);
