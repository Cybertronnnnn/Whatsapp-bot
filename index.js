require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const twilio = require('twilio')
const Groq = require('groq-sdk')
const { Pool } = require('pg')

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))

// Vérifier variables d'environnement
if (!process.env.GROQ_API_KEY) throw new Error("❌ GROQ_API_KEY manquante (Render)")
if (!process.env.DATABASE_URL) throw new Error("❌ DATABASE_URL manquante (Render)")

// Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// WhatsApp webhook
app.post('/whatsapp', async (req, res) => {
  const userMessage = req.body.Body || 'Message vide'
  const userNumber = req.body.From || 'Unknown'

  let reply = 'Désolé, une erreur est survenue.'

  try {
    // 🔹 Récupérer l'historique complet de l'utilisateur
    const previousMessages = await pool.query(
      'SELECT role, message, response FROM messages WHERE user_number = $1 ORDER BY id ASC',
      [userNumber]
    )

    // 🔹 Construire le contexte pour Groq
    const messagesForGroq = [
      { role: 'system', content: 'Tu es un assistant WhatsApp poli et clair.' },
      ...previousMessages.rows.map(row => ({
        role: row.role || 'user',
        content: row.message
      })),
      { role: 'user', content: userMessage }
    ]

    // 🔹 Appel Groq
    const completion = await groq.chat.completions.create({
      model: 'groq/compound-mini',
      messages: messagesForGroq
    })

    reply = completion.choices[0].message.content

    // 🔹 Sauvegarder le message et la réponse
    await pool.query(
      'INSERT INTO messages (user_number, message, response, role) VALUES ($1, $2, $3, $4)',
      [userNumber, userMessage, reply, 'user']
    )

  } catch (err) {
    console.error('❌ ERREUR GROQ / PostgreSQL :', err.message)
  }

  const twiml = new twilio.twiml.MessagingResponse()
  twiml.message(reply)
  res.type('text/xml').send(twiml.toString())
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur le port ${PORT}`)
})
