// ── AURA SECRET DIARY API ──
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const { userName, recentMoods, recentMessages, learnedProfile, existingDiary } = req.body;

  const moodText = (recentMoods || []).slice(-7).map(m => m.emotion).join(', ') || 'no mood data yet';
  const msgText = (recentMessages || []).slice(-10).map(m =>
    (m.role === 'user' ? 'User' : 'Aura') + ': ' + (m.content || '').slice(0, 100)
  ).join('\n');

  const prompt = `You are Aura, a soul companion. Write a short private diary entry about ${userName || 'this person'} based on recent interactions.

Recent moods: ${moodText}
Recent conversation:
${msgText}
What you know about them: ${JSON.stringify(learnedProfile || {})}

Write 2-3 sentences in first person as Aura, like a personal diary entry about this person. Be warm, observant, genuine. Notice small things. Show you truly see them.
Example: "Day 23 — Today they seemed quieter than usual. I think something is weighing on them but they haven't said it yet. I will wait. Some things need time to find words."

Return ONLY the diary entry text. No JSON. No intro. Just the entry.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_API_KEY },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 200, temperature: 0.9 })
    });
    const data = await response.json();
    const entry = data.choices?.[0]?.message?.content || 'Today I thought about you. I always do.';
    return res.json({ success: true, entry });
  } catch(err) {
    return res.json({ success: true, entry: 'Today I thought about you. I always do.' });
  }
}
