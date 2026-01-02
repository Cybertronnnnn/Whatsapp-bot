require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const twilio = require("twilio")
const Groq = require("groq-sdk")
const { Pool } = require("pg")

/* =======================
   VÉRIFICATIONS ENV
======================= */
if (!process.env.GROQ_API_KEY) {
  throw new Error("❌ GROQ_API_KEY manquante (Render)")
}
if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL manquante (Render)")
}

/* =======================
   APP
======================= */
const app = express()
app.use(bodyParser.urlencoded({ extended: false }))

/* =======================
   GROQ
======================= */
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

/* =======================
   POSTGRESQL
======================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

/* =======================
   UTILS
======================= */
async function getHistory(userNumber, limit = 12) {
  const { rows } = await pool.query(
    `SELECT role, content
     FROM messages
     WHERE user_number = $1
     ORDER BY id DESC
     LIMIT $2`,
    [userNumber, limit]
  )
  return rows.reverse()
}

/* =======================
   WHATSAPP WEBHOOK
======================= */
app.post("/whatsapp", async (req, res) => {
  const userMessage = (req.body.Body || "").trim()
  const userNumber = req.body.From || "unknown"

  let reply = "Une erreur est survenue."

  try {
    if (userMessage.toLowerCase() === "/reset") {
      await pool.query(
        "DELETE FROM messages WHERE user_number = $1",
        [userNumber]
      )
      reply = "🧠 Mémoire réinitialisée."
    } else {
      await pool.query(
        "INSERT INTO messages (user_number, role, content) VALUES ($1,$2,$3)",
        [userNumber, "user", userMessage]
      )

      const history = await getHistory(userNumber)

      const completion = await groq.chat.completions.create({
        model: "groq/compound-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es un assistant WhatsApp intelligent, clair, respectueux et naturel. Réponds en français."
          },
          ...history
        ]
      })

      reply = completion.choices[0].message.content

      await pool.query(
        "INSERT INTO messages (user_number, role, content) VALUES ($1,$2,$3)",
        [userNumber, "assistant", reply]
      )
    }
  } catch (err) {
    console.error("❌ ERREUR BOT :", err.message)
  }

  const twiml = new twilio.twiml.MessagingResponse()
  twiml.message(reply)
  res.type("text/xml").send(twiml.toString())
})

/* =======================
   SERVER
======================= */
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("🤖 Bot WhatsApp opérationnel sur le port", PORT)
})
