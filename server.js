const express = require('express');
const path    = require('path');
const axios   = require('axios');
const app     = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

const CLAUDE_KEY = process.env.CLAUDE_KEY;
const EL_KEY     = process.env.EL_KEY;

const VOICES = {
  en: process.env.EL_VOICE_EN,
  hi: process.env.EL_VOICE_HI,
  pa: 'vT0wMbLG5dssaBsksrb6',    // Noor — Punjabi female, Doaba accent, natural clarity
};

console.log('CeremonyAI starting...');
console.log('Claude key:', CLAUDE_KEY ? '✅ set' : '❌ MISSING');
console.log('EL key:', EL_KEY ? '✅ set' : '❌ MISSING');
console.log('Voices EN/HI/PA:', VOICES.en ? '✅' : '❌', VOICES.hi ? '✅' : '❌', VOICES.pa ? '✅' : '❌');

// ── Claude ──────────────────────────────────────────────────────────────────
app.post('/api/claude', async (req, res) => {
  if (!CLAUDE_KEY) return res.status(500).json({ error: 'CLAUDE_KEY not set' });
  try {
    const r = await axios.post('https://api.anthropic.com/v1/messages', req.body, {
      headers: {
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    res.json(r.data);
  } catch(e) {
    console.error('Claude error:', e.response?.status, e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── ElevenLabs TTS ──────────────────────────────────────────────────────────
app.post('/api/tts', async (req, res) => {
  if (!EL_KEY) return res.status(500).json({ error: 'EL_KEY not set' });
  try {
    const { text, lang } = req.body;

    // Fix common mispronunciations before sending to ElevenLabs
    let fixed = text
      .replace(/\bVeg\b/g, 'Vej')
      .replace(/\bveg\b/g, 'vej')
      .replace(/\bNon-Veg\b/g, 'Non-Vej')
      .replace(/\bnon-veg\b/g, 'non-vej')
      .replace(/\bLassi\b/g, 'Luhsi')
      .replace(/\blassi\b/g, 'luhsi')
      .replace(/\bNaan\b/g, 'Naan')
      .replace(/\bGulab Jamun\b/gi, 'Gulab Jamoon')
      .replace(/\bBiryani\b/gi, 'Biryaani');

    // Punjabi-specific: soften Ceremony name pronunciation + common food words
    if (lang === 'pa') {
      fixed = fixed
        .replace(/Ceremony/g, 'Seremoni')           // Softer C sound
        .replace(/ਚਾਹੀਦਾ/g, 'ਚਾਹੀਦਾ')              // Keep natural
        .replace(/ਕੀ ਚਾਹੀਦਾ/g, 'ਕੀ ਚਾਹੀਦਾ')        // Keep natural  
        .replace(/\$(\d+)/g, '$1 ਡਾਲਰ')            // "$18" → "18 ਡਾਲਰ" — more natural Punjabi
        .replace(/total/gi, 'ਕੁੱਲ')                  // "total" → Punjabi word
        .replace(/order/gi, 'ਆਰਡਰ');
    }

    const voiceId = VOICES[lang] || VOICES.en;

    // eleven_multilingual_v2 for all — better natural human tone than turbo
    const modelId = 'eleven_multilingual_v2';

    console.log('TTS | lang:', lang, '| voice:', voiceId, '| model:', modelId, '| text[:50]:', fixed?.substring(0,50));

    // All languages — same warm natural human conversation profile
    // stability: 0.40 = natural variation, not robotic, not erratic
    // similarity_boost: 0.75 = stays close to voice without forcing it
    // style: 0.10 = minimal style exaggeration — just a real person talking
    // use_speaker_boost: false — this adds harshness/aggression, keep off
    const voiceSettings = {
      en: { stability: 0.40, similarity_boost: 0.75, style: 0.10, use_speaker_boost: false },
      hi: { stability: 0.40, similarity_boost: 0.75, style: 0.10, use_speaker_boost: false },
      pa: { stability: 0.45, similarity_boost: 0.72, style: 0.12, use_speaker_boost: true },
    };

    const r = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: fixed,
        model_id: modelId,
        voice_settings: voiceSettings[lang] || voiceSettings.en
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
    res.setHeader('Cache-Control', 'no-cache');
    res.send(Buffer.from(r.data));
  } catch(e) {
    console.error('EL error:', e.response?.status, e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`CeremonyAI live on port ${PORT}`));
