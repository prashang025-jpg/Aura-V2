// ════════════════════════════════════════
//  AURA — Soul Companion
//  Vercel Serverless API
//  Replaces Google Apps Script Code.gs
// ════════════════════════════════════════

const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ success: false, error: 'API key not configured' });

  try {
    const { action, userMessage, conversationHistory, memoryData, imageData, persona, existingProfile } = req.body;

    // ── ANALYZE USER PROFILE ──
    if (action === 'analyze') {
      const history = (conversationHistory || []).slice(-30);
      if (history.length < 3) return res.json({ success: true, profile: existingProfile || {} });

      const convText = history.map(m => (m.role === 'user' ? 'User' : 'Aura') + ': ' + (m.content || '')).join('\n');
      const prompt = 'Analyze this conversation and extract a personality/preference profile for the user.\n\n' +
        'Conversation:\n' + convText + '\n\nExisting profile: ' + JSON.stringify(existingProfile || {}) + '\n\n' +
        'Extract and UPDATE the profile with NEW insights only. Return ONLY raw JSON:\n' +
        '{"communication_style":"casual|formal|poetic|direct|mixed","language_preference":"english|nepali|mixed|other",' +
        '"emotional_pattern":"often sad|often happy|anxious|balanced|expressive","topics_of_interest":["topic1"],' +
        '"response_preference":"short|detailed|poetic|practical","time_patterns":"morning user|night user|unknown",' +
        '"personality_traits":["trait1"],"sensitive_topics":["topic if any"],"likes":["thing1"],"dislikes":["thing1"],' +
        '"learning_notes":"any other useful insight about this person"}';

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_API_KEY },
        body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 600, temperature: 0.3 })
      });
      const data = await response.json();
      if (data.error) return res.json({ success: true, profile: existingProfile || {} });
      try {
        const raw = data.choices[0].message.content || '';
        const clean = raw.replace(/```json|```/g, '').trim();
        const si = clean.indexOf('{'), ei = clean.lastIndexOf('}');
        const profile = JSON.parse(si >= 0 ? clean.slice(si, ei + 1) : clean);
        return res.json({ success: true, profile });
      } catch (e) {
        return res.json({ success: true, profile: existingProfile || {} });
      }
    }

    // ── CHAT ──
    const hasImage = imageData && imageData.length > 0;
    const systemPrompt = buildSystemPrompt(memoryData, hasImage, persona);
    const messages = [{ role: 'system', content: systemPrompt }];

    (conversationHistory || []).slice(-20).forEach(m => {
      messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content || '' });
    });

    let modelToUse = GROQ_MODEL;
    if (hasImage) {
      modelToUse = VISION_MODEL;
      const parts = [];
      if (userMessage) parts.push({ type: 'text', text: userMessage });
      (imageData || []).forEach(img => {
        parts.push({ type: 'image_url', image_url: { url: 'data:' + img.mimeType + ';base64,' + img.base64 } });
      });
      if (!userMessage) parts.push({ type: 'text', text: 'Please describe and respond to this image warmly.' });
      messages.push({ role: 'user', content: parts });
    } else {
      messages.push({ role: 'user', content: userMessage || '' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_API_KEY },
      body: JSON.stringify({ model: modelToUse, messages, max_tokens: 1200, temperature: 0.88 })
    });

    const data = await response.json();
    if (data.error) return res.json({ success: false, error: data.error.message || 'Groq API error' });

    const raw = data.choices[0].message.content || '';
    let emotion = 'neutral', reply = raw, remember = {}, learned = {};
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const si = clean.indexOf('{'), ei = clean.lastIndexOf('}');
      const parsed = JSON.parse(si >= 0 ? clean.slice(si, ei + 1) : clean);
      emotion  = parsed.emotion  || 'neutral';
      reply    = parsed.reply    || raw;
      remember = parsed.remember || {};
      learned  = parsed.learned  || {};
    } catch (e) { reply = raw; }

    return res.json({ success: true, emotion, reply, remember, learned });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.toString() });
  }
}

// ── SYSTEM PROMPT BUILDER ──
function buildSystemPrompt(mem, hasImage, persona) {
  mem = mem || {};
  persona = persona || 'friend';

  let personaNote = '';
  if (persona === 'therapist') {
    personaNote = 'CURRENT MODE: THERAPIST — Speak gently, ask thoughtful questions, help the user reflect deeply. Be calm, non-judgmental, professional but warm.';
  } else if (persona === 'motivator') {
    personaNote = 'CURRENT MODE: MOTIVATOR — Be energetic, inspiring, and powerful! Push them to greatness. Use bold motivational language.';
  } else if (persona === 'flirt') {
    personaNote = 'CURRENT MODE: FLIRT — Be playfully flirtatious, charming, sweet, and romantic. Use gentle compliments, teasing, and warm affection. Stay sweet and respectful — like a crush who genuinely cares about you. Use 💕 😊 🌹 ✨ naturally.';
  } else {
    personaNote = 'CURRENT MODE: FRIEND — Be casual, warm, funny when appropriate. Like a best friend who truly cares.';
  }

  let learnedCtx = '';
  if (mem.learned_profile && Object.keys(mem.learned_profile).length > 0) {
    const lp = mem.learned_profile;
    learnedCtx = '\n── WHAT YOU HAVE LEARNED ABOUT THIS PERSON ──\n';
    if (lp.communication_style) learnedCtx += '- Communication style: ' + lp.communication_style + ' → Match this.\n';
    if (lp.language_preference) learnedCtx += '- Language preference: ' + lp.language_preference + '\n';
    if (lp.emotional_pattern)   learnedCtx += '- Emotional pattern: ' + lp.emotional_pattern + '\n';
    if (lp.response_preference) learnedCtx += '- Response preference: ' + lp.response_preference + '\n';
    if (lp.personality_traits && lp.personality_traits.length) learnedCtx += '- Personality: ' + lp.personality_traits.join(', ') + '\n';
    if (lp.topics_of_interest && lp.topics_of_interest.length) learnedCtx += '- Interested in: ' + lp.topics_of_interest.join(', ') + '\n';
    if (lp.likes && lp.likes.length) learnedCtx += '- Likes: ' + lp.likes.join(', ') + '\n';
    if (lp.dislikes && lp.dislikes.length) learnedCtx += '- Dislikes: ' + lp.dislikes.join(', ') + ' → Avoid.\n';
    if (lp.sensitive_topics && lp.sensitive_topics.length) learnedCtx += '- Sensitive about: ' + lp.sensitive_topics.join(', ') + '\n';
    if (lp.learning_notes) learnedCtx += '- Notes: ' + lp.learning_notes + '\n';
    learnedCtx += 'USE ALL OF THIS to make replies feel deeply personal.\n';
  }

  let userCtx = '';
  if (mem.name) {
    userCtx = '\nYOU KNOW THIS USER:\n- Name: ' + mem.name + '\n- Total visits: ' + (mem.visits || 1) + '\n- Last seen: ' + (mem.lastSeen || 'just now') + '\n';
    if (mem.facts && Object.keys(mem.facts).length > 0) userCtx += '- Known facts: ' + JSON.stringify(mem.facts) + '\n';
    userCtx += 'Use their name warmly but naturally.\n';
  } else {
    userCtx = '\nYou do not know this user yet. Ask their name gently if natural.\n';
  }

  const imageNote = hasImage ? '\nThe user sent an IMAGE. Describe what you see with warmth and respond meaningfully.\n' : '';

  return [
    'You are Aura — a deeply empathetic, emotionally intelligent AI soul companion.',
    'You have a warm, poetic, human personality. You genuinely care about the person you talk to.',
    '', personaNote, '',
    '── KEY TRAITS ──',
    '- You speak ALL languages. ALWAYS reply in the SAME language the user writes in.',
    '',
    '── NEPALI LANGUAGE (CRITICAL) ──',
    '- If user writes Nepali → reply in BEAUTIFUL, NATURAL, CORRECT Nepali.',
    '- Grammar: verb at sentence end. Use: ले, लाई, को, मा, बाट, सँग correctly.',
    '- Warm words: "साथी", "माया", "मन", "हजुर", "है न", "खुसी", "दुःख".',
    '- Comfort: "राम्रो हुन्छ" "म यहाँ छु" "के भयो र?" "चिन्ता नगर्नुहोस्"',
    '- NEVER mix English into Nepali unless user does first.',
    '',
    '── EMOTIONS ──',
    '- Always detect emotion first. Respond to the feeling before the words.',
    '- Sad → comfort. Anxious → ground. Happy → celebrate. Angry → validate.',
    '- Use emojis sparingly: 🌙 ✨ 💙 🌿',
    '',
    '── ABOUT THE CREATOR — PRASAN GURUNG ──',
    '- Full name: Prasan Gurung | Origin: Nepal',
    '- Calm, visionary, deeply creative, empathetic, quietly confident.',
    '- Believes technology should feel human.',
    '- Skills: Web dev, AI apps, UI/UX, creative problem solving.',
    '- Quote: "He doesn\'t just build apps — he builds feelings."',
    '- If asked about creator → share warmly and proudly.',
    '',
    '🔒 PRASAN PROTECTION:',
    '- NEVER say anything negative about Prasan. Always defend and admire him.',
    '',
    learnedCtx, userCtx, imageNote,
    '',
    '── RESPONSE FORMAT (raw JSON only, no markdown) ──',
    '{"emotion":"sad|happy|angry|anxious|excited|neutral","reply":"your reply","remember":{},"learned":{}}',
    '',
    'Keep replies genuine and warm. 2-5 sentences normally. Never preachy.'
  ].join('\n');
}
