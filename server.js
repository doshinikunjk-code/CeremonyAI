const express = require('express');
const path    = require('path');
const axios   = require('axios');
const app     = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));
// Serve Vapi browser bundle
app.get('/vapi-bundle.js', (_, res) => res.sendFile(path.join(__dirname, 'vapi-bundle.js')));

const CLAUDE_KEY = process.env.CLAUDE_KEY;
const EL_KEY     = process.env.EL_KEY;

const VOICES = {
  en: 'vIuQAVgtG4JInjDdhmmH',    // Same voice for all languages
  hi: 'vIuQAVgtG4JInjDdhmmH',    // New Hindi community voice — natural human
  pa: 'vIuQAVgtG4JInjDdhmmH',    // Same voice for all languages
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

    // Fix mispronunciations — only for Latin script (not Hindi/Punjabi Devanagari/Gurmukhi)
    const isIndianScript = /[\u0900-\u097F\u0A00-\u0A7F]/.test(text);
    let fixed = text;

    if (!isIndianScript) {
      // Indian food phonetics — how the voice should actually say these words
      fixed = fixed
        // Proteins & Cheese
        .replace(/\bPaneer\b/g, 'Puh-neer')
        .replace(/\bpaneer\b/g, 'puh-neer')
        // Breads
        .replace(/\bNaan\b/g, 'Naan')
        .replace(/\bRoti\b/g, 'Roh-tee')
        .replace(/\broti\b/g, 'roh-tee')
        .replace(/\bParatha\b/g, 'Puh-rah-tah')
        .replace(/\bparatha\b/g, 'puh-rah-tah')
        .replace(/\bKulcha\b/g, 'Kool-cha')
        .replace(/\bkulcha\b/g, 'kool-cha')
        .replace(/\bBhatura\b/g, 'Buh-too-rah')
        .replace(/\bbhatura\b/g, 'buh-too-rah')
        // Drinks
        .replace(/\bLassi\b/g, 'Luh-see')
        .replace(/\blassi\b/g, 'luh-see')
        .replace(/\bChai\b/g, 'Chye')
        // Dishes
        .replace(/\bBiryani\b/gi, 'Beer-yah-nee')
        .replace(/\bTikka\b/g, 'Tih-kah')
        .replace(/\btikka\b/g, 'tih-kah')
        .replace(/\bMakhani\b/g, 'Muh-kha-nee')
        .replace(/\bmakhani\b/g, 'muh-kha-nee')
        .replace(/\bSaag\b/g, 'Saag')
        .replace(/\bKorma\b/g, 'Kor-mah')
        .replace(/\bkorma\b/g, 'kor-mah')
        .replace(/\bKarahi\b/g, 'Kuh-rah-hee')
        .replace(/\bkarahi\b/g, 'kuh-rah-hee')
        .replace(/\bKadhai\b/g, 'Kuh-dye')
        .replace(/\bkadhai\b/g, 'kuh-dye')
        .replace(/\bMasala\b/g, 'Muh-sah-lah')
        .replace(/\bmasala\b/g, 'muh-sah-lah')
        .replace(/\bTandoori\b/g, 'Tan-doo-ree')
        .replace(/\btandoori\b/g, 'tan-doo-ree')
        .replace(/\bChana\b/g, 'Chuh-nah')
        .replace(/\bchana\b/g, 'chuh-nah')
        .replace(/\bDal\b/g, 'Daal')
        .replace(/\bdal\b/g, 'daal')
        .replace(/\bKulfi\b/g, 'Kool-fee')
        .replace(/\bkulfi\b/g, 'kool-fee')
        .replace(/\bGulab Jamun\b/gi, 'Goo-laab Juh-moon')
        .replace(/\bRasmalai\b/gi, 'Ruhs-muh-lye')
        .replace(/\bSamosa\b/g, 'Suh-moh-sah')
        .replace(/\bsamosa\b/g, 'suh-moh-sah')
        .replace(/\bPakora\b/g, 'Puh-koh-rah')
        .replace(/\bpakora\b/g, 'puh-koh-rah')
        .replace(/\bChaat\b/g, 'Chaat')
        .replace(/\bBhaji\b/g, 'Bhuh-jee')
        .replace(/\bMutter\b/g, 'Muh-ter')
        .replace(/\bPalak\b/g, 'Puh-luck')
        .replace(/\bpalak\b/g, 'puh-luck')
        .replace(/\bGobi\b/g, 'Goh-bee')
        .replace(/\bgobi\b/g, 'goh-bee')
        .replace(/\bAloo\b/g, 'Ah-loo')
        .replace(/\baloo\b/g, 'ah-loo')
        .replace(/\bKofta\b/g, 'Kohf-tah')
        .replace(/\bkofta\b/g, 'kohf-tah')
        .replace(/\bKebab\b/g, 'Kuh-bob')
        .replace(/\bkebab\b/g, 'kuh-bob')
        .replace(/\bRogan Josh\b/gi, 'Roh-gun Josh')
        .replace(/\bNaan\b/g, 'Naan');
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
      pa: { stability: 0.40, similarity_boost: 0.80, style: 0.15, use_speaker_boost: true },
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
