require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const twilio = require('twilio')
const { OpenAI } = require('openai')
const { Pool } = require('pg')

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))

// ===== GROQ (OpenAI compatible) =====
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
})

// ===== POSTGRESQL =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// ===== WHATSAPP WEBHOOK =====
app.post('/whatsapp', async (req, res) => {
  const userMessage = req.body.Body || ''
  const userNumber = req.body.From || ''

  let reply = 'Désolé, une erreur est survenue.'

  try {
    const completion = await openai.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [
        { role: 'system', content: 'Tu es un assistant WhatsApp intelligent et utile.' },
        { role: 'user', content: userMessage }
      ]
    })

    reply = completion.choices[0].message.content

    await pool.query(
      'INSERT INTO messages (user_number, message, response) VALUES ($1, $2, $3)',
      [userNumber, userMessage, reply]
    )

  } catch (err) {
    console.error('Erreur Groq ou DB:', err.message)
  }

  const twiml = new twilio.twiml.MessagingResponse()
  twiml.message(reply)
  res.type('text/xml').send(twiml.toString())
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`)
})
