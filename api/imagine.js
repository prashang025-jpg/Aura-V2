// ── AURA Image Generation API ──
// Uses Pollinations.ai (free, no key needed)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, style } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: 'No prompt provided' });

  const styleMap = {
    anime: 'anime style, vibrant, detailed',
    realistic: 'photorealistic, 8k, detailed',
    watercolor: 'watercolor painting, soft, artistic',
    sketch: 'pencil sketch, hand-drawn, artistic',
    fantasy: 'fantasy art, magical, ethereal, glowing',
    default: 'beautiful, detailed, artistic'
  };

  const stylePrompt = styleMap[style] || styleMap.default;
  const fullPrompt = encodeURIComponent(prompt + ', ' + stylePrompt);
  const seed = Math.floor(Math.random() * 999999);

  // Pollinations.ai - completely free image generation
  const imageUrl = `https://image.pollinations.ai/prompt/${fullPrompt}?width=512&height=512&seed=${seed}&nologo=true&enhance=true`;

  return res.json({
    success: true,
    imageUrl,
    prompt
  });
}
