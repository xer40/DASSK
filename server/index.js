// Load environment variables from your server/.env file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
// 1. ADD THIS LINE: Import the bcrypt library to fix the crash
const bcrypt = require('bcrypt');

const app = express();

// Middleware
app.use(cors());          // Allows your React app to communicate with this API
app.use(express.json());  // Allows your server to parse incoming JSON data

// Configure the connection pool to your cloud database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Add a simple test route to check if the backend works
app.get('/', (req, res) => {
  res.send('🚀 Node.js backend is running successfully!');
});

// Add a database test route for your React app
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

// 2. NOTE: The empty GET route /api/register/:id/:password has been removed.
// Exposing raw passwords in a URL is insecure and bypasses the req.body layout.

// 3. Secure Route: Create/Register a New User with Hashed Password
app.post('/api/register', async (req, res) => {
  const { id, password } = req.body;
  console.log(`Attempting to create user: ${id}`); // Removed password from logs for security

  // Validate the inputs
  if (!id || !password) {
    return res.status(400).json({
      success: false,
      message: 'Both id and password fields are required.'
    });
  }

  try {
    // Generate salt and hash the plain text password asynchronously
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into your custom table using parameterized queries to protect against SQL injection
    const insertQuery = 'INSERT INTO users (id, password) VALUES (\$1, \$2) RETURNING id';
    const values = [id, hashedPassword];

    const result = await pool.query(insertQuery, values);

    // Send a secure success response back to React (omitting the password hash)
    return res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      user: {
        id: result.rows[0].id
      }
    });

  } catch (err) {
    // Check for PostgreSQL unique constraint violation error code (duplicate username/id)
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'This user ID is already taken.'
      });
    }

    console.error('❌ Error creating user:', err.message);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred.'
    });
  }
});

app.delete('/del_db', async (req, res) => {
  const deleteQuery = "TRUNCATE table users";
  
  try {
    await pool.query(deleteQuery);
    console.log("Database Cleared 🫪")
    res.json({ status: 'good' });
  } catch (error) {
    console.error(error);
    // Always send a response in the catch block so the client isn't left hanging
    res.status(500).json({ status: 'error', message: 'Failed to delete data' });
  }
});


// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Test the API at: http://localhost:${PORT}/api/test-db`);
});
