// Load environment variables from your server/.env file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
// Import the official Google Gen AI SDK
const { GoogleGenAI } = require('@google/genai');

const app = express();

// Middleware
app.use(cors());          // Allows your React app to communicate with this API
app.use(express.json());  // Allows your server to parse incoming JSON data

// Configure the connection pool to your cloud database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

/**
 * AI DIAGNOSTIC CHATBOT ROUTE
 * Expects { userId: "user_id_here", message: "User question here" } in req.body
 * Fetches user's car profiles & service logs from DB to inform Gemini Flash
 */
app.post('/api/chat', async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ success: false, message: 'Missing userId or message.' });
  }

  try {
    // 1. Fetch vehicle profile data from database
    const vehicleQuery = 'SELECT make, model, year, current_mileage FROM vehicles WHERE user_id = \$1';
    const vehicleRes = await pool.query(vehicleQuery, [userId]);
    
    // 2. Fetch all service history entries from database
    const logsQuery = 'SELECT service_date, service_type, mileage_at_service, notes FROM maintenance_logs WHERE user_id = \$1 ORDER BY service_date DESC';
    const logsRes = await pool.query(logsQuery, [userId]);
    
    // 3. Format vehicle specification details into a readable snippet
    let vehicleSpecContext = "Unknown Vehicle Profile (No car specs provided yet).";
    if (vehicleRes.rows.length > 0) {
      const car = vehicleRes.rows[0];
      vehicleSpecContext = `Vehicle: ${car.year} ${car.make} ${car.model}\nCurrent Mileage: ${car.current_mileage} miles`;
    }

    // 4. Format historical logs into a clean, list-based context block
    let historyContext = "No prior service history recorded.";
    if (logsRes.rows.length > 0) {
      historyContext = logsRes.rows.map(log => {
        const formattedDate = log.service_date ? new Date(log.service_date).toISOString().split('T')[0] : 'N/A';
        return `- Date: ${formattedDate}, Service: ${log.service_type}, Mileage: ${log.mileage_at_service || 'N/A'}, Notes: ${log.notes || 'None'}`;
      }).join('\n');
    }

    // 5. Build rigid system behavioral parameters for Gemini
    const systemInstruction = `
      You are an expert AI automotive diagnostic assistant. 
      Analyze the user's car symptoms explicitly against their provided vehicle specs and service logs. 
      Evaluate if recent services could relate to the current issue, or if deferred maintenance might be the cause.
      Provide realistic troubleshooting paths and remind them if safety components (brakes, steering) need physical inspection.
    `;

    // 6. Request predictive completion from gemini-2.5-flash
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        [VEHICLE SPECIFICATIONS]
        ${vehicleSpecContext}

        [USER SERVICE HISTORY LOGS]
        ${historyContext}
        
        [USER DIAGNOSTIC QUESTION]
        ${message}
      `,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    // Send AI generated resolution text cleanly back to client
    return res.json({
      success: true,
      reply: response.text
    });

  } catch (err) {
    console.error('❌ Chatbot Error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to process AI diagnostics.' });
  }
});

// Secure Route: Create/Register a New User with Hashed Password
app.post('/api/register', async (req, res) => {
  const { id, password, email } = req.body;
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
    const insertQuery = 'INSERT INTO users (id, password, email) VALUES (\$1, \$2, \$3) RETURNING id';
    const values = [id, hashedPassword, email];

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
      console.log(`Could not create user: ${id} (Duplicate User)`)
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
  const deleteQuery = "TRUNCATE table users CASCADE"; // Added CASCADE to auto-clear dependent car tables during reset
  
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