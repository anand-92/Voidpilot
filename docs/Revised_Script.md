Here is the formatted **`demo-script.md`** file for your repository. I’ve structured it to highlight the technical requirements (barge-in, agentic delegation, and cloud deployment) that the hackathon judges will be looking for.

---

# # Voidpilot Demo Video Script

**Project URL:** [https://hackathon.remembr-ai.com](https://hackathon.remembr-ai.com)  
**Target Length:** 3:45 (Under 4-minute limit)  
**Core Rule:** 100% Live software — No mockups.

---

## 1. The Story: Problem & Solution (0:00 – 0:35)

**[Screen: Landing page at hackathon.remembr-ai.com]**

> "Most AI assistants today are trapped in a 'wait-and-read' loop. But real creative brainstorming is fluid, messy, and fast. We built **Voidpilot** to turn AI into a high-fidelity creative partner that hears you, speaks to you, and builds alongside you in real-time."
>
> "Voidpilot is a multimodal, multi-agent workspace that solves the 'latency of thought' by moving beyond the text box. Let’s see it in action."

---

## 2. The "Live" Factor: Voice & Barge-in (0:35 – 1:20)

**[Screen: Click 'Enter Live Mode'. Show the WebSocket connection status briefly.]**

* **Sofia:** "Hey, can you start listing some ideas for a cyberpunk city layout?"
* **Gemini (Voice):** "Sure! First, let's talk about the Neon District, where high-rise architecture meets..."
* **Sofia (Interrupting):** "Actually, stop—let's pivot. Focus on the *underground* slums first. What’s the lighting like there?"
* **Gemini:** (Stops immediately) "Got it. In the bioluminescent slums, the lighting is damp and flickering, using salvaged neon and organic fungal growth..."

> "Notice the **natural barge-in**. Voidpilot handles interruptions instantly over a stateful WebSocket connection to the Gemini Live API—no awkward pauses, just real conversation."

---

## 3. The Brain: Multi-Agent Brainstorm (1:20 – 2:30)

**[Screen: Navigate to 'Open Studio'. Show the pixel-art office visualization.]**

1.  **Voice Prompt:** "Let’s brainstorm a brand for an eco-friendly drone delivery service."
2.  **Artifact Generation:** (Point to the workspace as a Markdown file appears). "Gemini is calling `save_brainstorm_artifact` here."
3.  **Agentic Delegation:** "While we talk, Gemini 2.5 Flash is acting as a background worker to generate these visuals."
4.  **Image Generation:** "Generate a minimalist green logo for this." (Image appears in the workspace).

> "This is the **Multi-Agent Brainstorm**. While the Live API maintains our conversation, background Flash models handle parallel asset generation—allowing for real-time collaboration with zero context switching."

---

## 4. Creative Spark: Visual Flow (2:30 – 3:10)

**[Screen: Switch to 'Creative Spark' Mode. Masonry gallery view.]**

* **Sofia:** "I'm thinking about a rainy night in Tokyo."
* **Gemini:** "I'm adding a neon-soaked street corner to the gallery now. What if we add a lone cat in a transparent raincoat?"
* **Sofia:** "Yes, do that."
* **Visual Proof:** (Watch the gallery update live with new AI-driven visuals).

> "In **Creative Spark**, the AI drives the vision. No buttons or toggles—just voice and visuals filling the screen as the agent proactively suggests ideas and builds the gallery."

---

## 5. The Proof: Architecture & Cloud (3:10 – 3:40)

**[Screen: Switch to high-res Architecture Diagram from README.]**

> "Voidpilot is built with **React 19**, **FastAPI**, and **Firebase**. We use the Gemini Live API for bidirectional audio and Flash 2.5 for function calling and parallel generations."

**[Screen: Switch to Google Cloud Run Dashboard showing active traffic.]**

> "Everything is live and production-ready, deployed on **Google Cloud Run** via GitHub Actions. You can verify the performance and deployment on our live dashboard right here."

---

## 6. Closing (3:40 – 3:55)

**[Screen: Back to landing page or GitHub repository page.]**

> "Voidpilot: Moving AI from a tool you use to a partner you talk to. Check out the code on GitHub and try it live at hackathon.remembr-ai.com."
>
> "Build the future. Talk to Voidpilot."

---

## Recording Checklist
* [ ] **Audio:** Record in a quiet room; the Gemini Live API will pick up background noise.
* [ ] **Resolution:** Record at 1080p minimum.
* [ ] **The "Barge-in":** Make sure you interrupt Gemini clearly to prove the low-latency handling.
* [ ] **Technical Proof:** Ensure the "Cloud Run" dashboard shot is clear enough to read the service name.

---

Would you like me to generate a **README.md** summary that links to this demo for your final submission?
