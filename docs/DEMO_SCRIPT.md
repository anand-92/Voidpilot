# Voidpilot Demo Video Script

**Target length:** Under 4 minutes
**Rule:** All features shown live — no mockups.
**URL:** https://hackathon.remembr-ai.com

---

## 1. Hook + Problem (0:00 – 0:25)

**[Screen: Landing page at hackathon.remembr-ai.com]**

> "Every AI assistant today works the same way — you type, you wait, you read. But real creative work isn't like that. It's fast, it's messy, it's voice-first. What if you could just *talk* to an AI and have it create alongside you in real-time?"
>
> "This is Voidpilot."

---

## 2. Live Voice Assistant (0:25 – 0:55)

**[Screen: Click into Live Mode, connect mic]**

- Show the WebSocket connection happening (real-time, no loading spinners)
- Have a short natural voice conversation with Gemini — demonstrate low-latency turn-taking
- Point out real-time transcription appearing as you speak
- Briefly mention: "This is bidirectional audio streaming over WebSocket to Gemini Live, running on Cloud Run."

**What to say to Gemini:** Something simple and conversational so the response is quick — e.g., "Hey, what's the weather like in New York?" or "Tell me a fun fact about octopuses."

---

## 3. Open Studio — Multi-Agent Brainstorm (0:55 – 2:00)

**[Screen: Navigate to Brainstorm > Open Studio]**

- Show the mode selection screen (Open Studio vs Creative Spark)
- Pick **Open Studio**
- Show the pixel-art office visualization with Gemini agent

**Live demo sequence:**
1. **Voice prompt:** "Let's brainstorm a mobile app for helping people find local food trucks."
2. **Artifact generation:** Gemini calls `save_brainstorm_artifact` — show the markdown document appearing in the workspace panel while the conversation continues
3. **Image generation:** "Can you generate a logo concept for this app?" — show `generate_brainstorm_image` firing, image appearing in the workspace
4. **Multi-agent delegation:** Point out when Flash Worker gets delegated to — "Notice Gemini just delegated to a Flash model to handle that generation while we keep talking."
5. **Session persistence:** "All of this is saved to my session — I can come back to it later, download everything as a ZIP, or share it with a link."

**Key things to highlight:**
- Tools run in the background — conversation never pauses
- Multiple artifacts building up in the workspace
- The pixel-art agent visualization reacting

---

## 4. Creative Spark — Visual Inspiration (2:00 – 2:50)

**[Screen: Go back to mode selection > Creative Spark]**

- Show the **auto-start**: Gemini speaks first with a random conversation starter (e.g., "What did you have for lunch?")
- Give a mundane answer — e.g., "A turkey sandwich"
- Watch Gemini twist it into something dramatic and offer to generate a visual
- Say "Yeah, do it" — image appears in the full-screen masonry gallery
- Do one more round: give a short reaction ("Make it darker"), watch a second image generate
- Point out: "No buttons, no toggles — just voice and visuals filling the screen."

**Key things to highlight:**
- AI drives the creative direction, user just steers
- Masonry gallery fills in real-time
- Completely different UX from Open Studio, same backend

---

## 5. Sharing + Session Library (2:50 – 3:10)

**[Screen: Show session library or share flow]**

- Show a previously saved session in the session library
- Click share — show the public share link
- Open the share page: "Anyone with this link can see the full conversation, all generated images and videos, and download them."

---

## 6. Architecture + Cloud Deployment (3:10 – 3:35)

**[Screen: Quick cut to architecture diagram from README, then Cloud Run dashboard]**

> "Under the hood: React 19 frontend talks to a FastAPI backend over WebSocket. The backend wraps Gemini Live for real-time audio streaming and coordinates Flash models for parallel artifact generation. Firebase handles auth, session storage, and generated assets."

> "Everything runs on Google Cloud Run, deployed automatically via GitHub Actions on every push to main. Here's the live dashboard."

**[Screen: Flash the Cloud Run metrics dashboard (cloudrun-dashboard.png)]**

---

## 7. Closing (3:35 – 3:50)

**[Screen: Back to landing page or architecture diagram]**

> "Voidpilot breaks AI out of the text box. Talk naturally, generate visuals in real-time, brainstorm with an AI that actually creates alongside you — all running on Google Cloud."
>
> "Try it live at hackathon.remembr-ai.com."

---

## Recording Tips

- Use the **deployed production URL** (hackathon.remembr-ai.com) for all demos — proves it's real and live on Cloud Run
- Keep a quiet room — the mic capture is real and latency matters
- If Gemini takes a moment to respond, don't cut it — the real-time nature is the point
- Have a backup session pre-loaded in the session library in case you need to skip a flaky live generation
- Screen record at 1080p minimum
- Keep voiceover energy conversational, not scripted-sounding
