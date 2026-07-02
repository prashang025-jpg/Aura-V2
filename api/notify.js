// ── AURA Push Notification Scheduler ──
// Called by Vercel Cron Jobs

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const type = req.query.type || 'morning'; // morning | night | wisdom

  const prompts = {
    morning: 'Write a warm, sweet, short morning greeting (2-3 sentences max) from Aura, an AI soul companion. Be poetic, uplifting, personal. Sign off as Aura. No JSON - just the message.',
    night: 'Write a warm, sweet goodnight message (2-3 sentences) from Aura, an AI soul companion. Be gentle, calming, like tucking someone in. Sign off as Aura 🌙',
    wisdom: 'Write one deeply meaningful daily wisdom quote or reflection (2-3 sentences) from Aura. Make it poetic and personal, like something only a true friend would say. No JSON - just the message.'
  };

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_API_KEY },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompts[type] || prompts.morning }],
        max_tokens: 150,
        temperature: 0.9
      })
    });
    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || 'Good morning! I\'m thinking of you. 🌙';
    return res.json({ success: true, message, type });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.toString() });
  }
}
