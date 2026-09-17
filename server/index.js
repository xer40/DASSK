// Load environment variables from your server/.env file
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middleware
app.use(cors());          // Allows your React app to communicate with this API
app.use(express.json());  // Allows your server to parse incoming JSON data

// 1. Configure the connection pool to your cloud database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Uncomment the line below if your cloud provider (like Supabase/Neon) requires SSL
  // ssl: { rejectUnauthorized: false } 
});

// 2. Add a simple test route to check if the backend works
app.get('/', (req, res) => {
  res.send(' Node.js backend is running successfully!');
});

// 3. Add a database test route for your React app
app.get('/api/test-db', async (req, res) => {
  try {
    // Run a simple query to get the current timestamp from Postgres
    const result = await pool.query('SELECT NOW()');
    res.json({
      success: true,
      message: 'Successfully connected to PostgreSQL!',
      timestamp: result.rows[0].now,
    });
  } catch (err) {
    console.error('❌ Database query error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Test the API at: http://localhost:${PORT}/api/test-db`);
});