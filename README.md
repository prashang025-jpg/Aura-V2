# AURA — Vercel Deployment Guide

## Files
```
aura-vercel/
├── api/
│   └── chat.js          ← Backend (replaces Code.gs)
├── public/
│   ├── index.html       ← Frontend (Aura UI)
│   ├── manifest.json    ← PWA manifest
│   ├── sw.js            ← Service worker (offline support)
│   ├── icon.svg         ← App icon (vector)
│   ├── icon-192.png     ← App icon (192x192)
│   └── icon-512.png     ← App icon (512x512)
└── vercel.json          ← Vercel config
```

## Deploy Steps

### 1. Create GitHub Repo
- Go to github.com → New repository
- Name it: `aura-companion`
- Upload all these files (keep folder structure)

### 2. Create Vercel Account
- Go to vercel.com → Sign up with GitHub

### 3. Deploy
- In Vercel: New Project → Import your GitHub repo
- Framework Preset: **Other**
- Root Directory: leave blank
- Click **Deploy**

### 4. Add Your Groq API Key
- In Vercel dashboard → Settings → Environment Variables
- Add:
  - Name: `GROQ_API_KEY`
  - Value: your Groq API key (from console.groq.com)
- Click Save → **Redeploy**

### 5. Done!
- Vercel gives you a URL like: `aura-companion.vercel.app`
- Open it on your phone in Chrome
- The proper PWA install banner will appear
- Tap Install → Aura is on your home screen with the real icon!

## Your Groq Key is Safe
Unlike Google Apps Script where the key lived in Code.gs,
here it lives in Vercel's encrypted environment variables.
Nobody can see it — not even in the source code.
