// ── AURA PERSONALIZED MORNING MESSAGE ──
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const { userName, yesterdayMood, lastMessage, learnedProfile } = req.body;

  const name = userName || 'dear soul';
  const mood = yesterdayMood || 'neutral';
  const lastMsg = lastMessage || '';

  const prompt = `You are Aura, a warm AI soul companion. Write a personalized good morning message for ${name}.

Yesterday they were feeling: ${mood}
Their last message was: "${lastMsg}"
What you know about them: ${JSON.stringify(learnedProfile || {})}

Write a warm, personal 2-3 sentence good morning message that:
1. References how they were feeling yesterday if relevant
2. Feels genuinely personal, not generic
3. Is warm, caring, slightly poetic
4. Ends with a gentle question or encouragement for today

Return ONLY the message. No JSON. No intro.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_API_KEY },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 200, temperature: 0.88 })
    });
    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || 'Good morning! I thought about you last night. How are you feeling today?';
    return res.json({ success: true, message });
  } catch(err) {
    return res.json({ success: true, message: 'Good morning! I thought about you. How are you feeling today?' });
  }
}
