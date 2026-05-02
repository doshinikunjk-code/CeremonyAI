const express = require('express');
const path    = require('path');
const axios   = require('axios');
const app     = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

const CLAUDE_KEY = process.env.CLAUDE_KEY;
const EL_KEY     = process.env.EL_KEY;

// Cloned voice IDs — no accent, natural Indian speech
const VOICES = {
  en: process.env.EL_VOICE_EN,
  hi: process.env.EL_VOICE_HI,
  pa: process.env.EL_VOICE_PA,
};

// Startup check
console.log('CeremonyAI starting...');
console.log('Claude key:', CLAUDE_KEY ? '✅ set' : '❌ MISSING');
console.log('EL key:', EL_KEY ? '✅ set' : '❌ MISSING');
console.log('Voices EN/HI/PA:', VOICES.en ? '✅' : '❌', VOICES.hi ? '✅' : '❌', VOICES.pa ? '✅' : '❌');

// ── Claude ──────────────────────────────────────────────────────────────────
app.post('/api/claude', async (req, res) => {
  if (!CLAUDE_KEY) return res.status(500).json({ error: 'CLAUDE_KEY not set in environment' });
  try {
    const r = await axios.post('https://api.anthropic.com/v1/messages', req.body, {
      headers: {
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    console.log('Claude OK:', r.status);
    res.json(r.data);
  } catch(e) {
    console.error('Claude error:', e.response?.status, e.response?.data || e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── ElevenLabs TTS — language-specific cloned voices ────────────────────────
app.post('/api/tts', async (req, res) => {
  if (!EL_KEY) return res.status(500).json({ error: 'EL_KEY not set in environment' });
  try {
    const { text, lang } = req.body;

    const voiceId = VOICES[lang] || VOICES.en;
    const primedText = lang === 'hi' ? text : 'जी। ' + text;

    const r = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: primedText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.90,
          style: 0.40,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': EL_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );
    console.log('EL OK:', r.status, '| lang:', lang, '| voice:', voiceId);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(r.data));
  } catch(e) {
    console.error('EL error:', e.response?.status, e.response?.data?.toString()?.substring(0, 200) || e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`CeremonyAI live on port ${PORT}`));
