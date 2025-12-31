require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const twilio = require('twilio')
const OpenAI = require('openai')

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

app.post('/whatsapp', async (req, res) => {
  const userMessage = req.body.Body || 'Message vide'
  let reply = "Désolé, je n'ai pas pu répondre."

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un assistant WhatsApp intelligent, clair et respectueux. Tu réponds en français simple, avec des messages courts et utiles. Tu aides l'utilisateur sans être trop long."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 200,
      temperature: 0.6
    })

    reply = completion.choices[0].message.content
  } catch (error) {
    console.error("Erreur OpenAI:", error)
  }

  const twiml = new twilio.twiml.MessagingResponse()
  twiml.message(reply)

  res.type('text/xml').send(twiml.toString())
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`)
})
