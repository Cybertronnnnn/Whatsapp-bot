require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const OpenAI = require('openai');
const { saveMessage, getMessages } = require('./db');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/whatsapp', async (req, res) => {
  const userNumber = req.body.From || 'unknown';
  const userMessage = req.body.Body || 'Message vide';

  // Sauvegarder le message de l'utilisateur
  await saveMessage(userNumber, userMessage);

  // Récupérer l'historique
  const history = await getMessages(userNumber);

  let reply = 'Désolé, je n’ai pas pu répondre.';
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: history }]
    });
    reply = completion.choices[0].message.content;
  } catch (err) {
    console.error(err);
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);

  res.type('text/xml').send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));
