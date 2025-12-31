require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const { OpenAI } = require('openai');
const { Pool } = require('pg');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// --- OpenAI setup ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --- PostgreSQL setup ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- WhatsApp endpoint ---
app.post('/whatsapp', async (req, res) => {
  const userMessage = req.body.Body || 'Message vide';
  const userNumber = req.body.From || 'Unknown';

  let reply = 'Désolé, je n’ai pas pu répondre.';

  try {
    // OpenAI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userMessage }]
    });
    reply = completion.choices[0].message.content;

    // Save message and response in PostgreSQL
    await pool.query(
      'INSERT INTO messages (user_number, message, response) VALUES ($1, $2, $3)',
      [userNumber, userMessage, reply]
    );
  } catch (error) {
    console.error('Erreur OpenAI ou PostgreSQL:', error.response?.data || error.message || error);
  }

  // Send response back to WhatsApp
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type('text/xml').send(twiml.toString());
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});
