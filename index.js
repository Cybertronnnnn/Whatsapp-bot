require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const twilio = require('twilio')
const OpenAI = require('openai')

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

app.post('/whatsapp', async (req, res) => {
  const userMessage = req.body.Body || 'Message vide'
  let reply = 'Erreur, réessaie plus tard.'

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es un assistant WhatsApp clair et utile." },
        { role: "user", content: userMessage }
      ],
    })
    reply = completion.choices[0].message.content
  } catch (err) {
    console.error(err.message)
  }

  const twiml = new twilio.twiml.MessagingResponse()
  twiml.message(reply)
  res.type("text/xml").send(twiml.toString())
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("✅ Bot WhatsApp actif sur le port", PORT)
})
