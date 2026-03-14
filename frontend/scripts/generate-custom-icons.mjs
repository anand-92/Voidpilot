import { GoogleGenAI } from '@google/genai';
import { writeFileSync } from 'fs';

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GOOGLE_API_KEY environment variable is required');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const prompt = `You are an elite SVG icon designer and React developer. Your job is to create COMPLETELY UNIQUE, custom-drawn, animated SVG icons that look like nothing in any standard icon library (Lucide, Heroicons, Phosphor, etc). These are brand icons for "Voidpilot" — a futuristic AI desktop agent with a dark theme (dark blues, cyans, indigos).

DESIGN PHILOSOPHY:
- These icons must be UNMISTAKABLY CUSTOM. No one should look at them and think "that's from Lucide" or "that's a standard mic icon"
- Think conceptual / abstract / metaphorical rather than literal
- Use overlapping shapes, wireframe 3D elements, particle effects, orbital paths, waveforms, circuit traces
- Every icon should have meaningful animation that reinforces its concept
- They should feel like they belong in a sci-fi HUD or an AI research lab interface
- At 20-28px they should still read clearly — don't over-detail

TECHNICAL REQUIREMENTS:
- Each icon is a React functional component accepting \`props: SVGProps<SVGSVGElement>\`
- Use \`motion\` from "framer-motion" for animations (import { motion } from "framer-motion")
- Import type { SVGProps } from "react"
- viewBox="0 0 24 24" for all icons (except GeminiLiveLogo which uses "0 0 28 24")
- Use "currentColor" for stroke/fill so colors are inherited via className
- strokeWidth="1.2"-"1.5", strokeLinecap="round", strokeLinejoin="round" as defaults
- className={props.className} on the root svg element
- Animations should be subtle, smooth, and performant
- Each component must be exported (named export)
- For animateMotion paths, use standard SVG \`<animateMotion>\` elements inside \`<motion.circle>\` etc
- IMPORTANT: for motion.svg elements, pass className like this: \`className={props.className}\` — do NOT spread {...props} (it causes type issues with motion)

FILE STRUCTURE:
\`\`\`tsx
import type { SVGProps } from "react";
import { motion } from "framer-motion";

export function IconName(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      {/* paths */}
    </motion.svg>
  );
}
\`\`\`

NOW GENERATE THESE 10 ICONS:

1. **GeminiLiveLogo** — THE brand mark for "Voidpilot". A 3D wireframe gem/diamond shape (faceted with visible edges showing depth) with two animated broadcast/signal arcs pulsing outward from its right side. The gem draws itself in on mount (staggered facets). The arcs fade in and out on loop. Use viewBox="0 0 28 24" to accommodate the arcs. This is used at h-6 w-6 next to the app title. Should feel premium and unique.

2. **IconOverviewOrbit** — For the "Overview" index card (voice + 3D playground). NOT a standard eye or play button. Think: a central lens/node with an elliptical orbit ring around it, and two small dots tracing the orbit at different speeds. One dot is brighter than the other. The orbit ring should be tilted (rotated). The center lens pulses gently. Feels like a planetary system or electron cloud.

3. **IconCapabilitiesConverge** — For the "Capabilities" index card (multimodal synergy). NOT standard layers/stack. Think: three input signal paths converging into a central node from different angles (top-left, left, bottom-left), and a single output beam shooting out to the right with an arrowhead. The input dots pulse, the central node breathes, and the output beam animates in/out. Feels like data fusion.

4. **IconHackathonLaunch** — For the "Hackathon" index card. NOT a standard trophy or rocket. Think: a stylized launchpad — a pointed rocket/arrow shape with two small fins, a circular window, and animated exhaust flames below it (flickering via scaleY animation). Small spark dots drift downward from the exhaust. The rocket draws itself in on mount. Feels like ignition.

5. **IconVoiceWaveform** — For "Voice chat that feels immediate" capability. NOT a standard microphone. Think: two mirrored waveform curves (like audio visualization) that breathe open and closed symmetrically around a horizontal center axis. A small bright dot sits at the center (the "source"). The curves animate between expanded and contracted states. Feels like a mouth speaking or a soundwave visualizer.

6. **IconScene3D** — For "Prompt-driven 3D scenes" capability. NOT a standard cube/box. Think: a wireframe triangle (front face) with dashed depth lines connecting to a back vertex, creating a clear 3D tetrahedron/prism feel. The front triangle draws itself, then the depth lines appear with staggered delays. The apex vertex floats slightly up and down. A small dot at the back vertex pulses. Feels like a 3D wireframe rendering.

7. **IconIterationLoop** — For "Faster creative iteration" capability. NOT a standard refresh arrow. Think: an infinity symbol / figure-8 path drawn with a single continuous stroke, with a bright particle racing along the path endlessly (using SVG animateMotion). A second dimmer trail particle follows behind it. The path itself draws on mount. Feels like perpetual motion / creative flow.

8. **IconLiveAgent** — For "Live Agents" hackathon card. NOT a standard mic or bot. Think: a neural network node — a central circle with four synapse arms reaching to corner nodes. Small particles fire along two of the arms (using animateMotion). The corner nodes pulse with staggered timing. The central node has an inner core dot. Feels like a brain firing.

9. **IconStoryteller** — For "Creative Storyteller" hackathon card. NOT a standard globe or book. Think: three overlapping rectangular frames fanned out like a deck of cards (tilted at -12°, -5°, and 0°), with the front frame having a play triangle at its center. A small 4-pointed sparkle floats near the top-right corner. The frames appear with staggered delays, the play icon pulses, and the sparkle twinkles. Feels like multimedia storytelling.

10. **IconUINavigator** — For "UI Navigator" hackathon card. NOT standard layers or a cursor. Think: a classic arrow cursor shape with a targeting reticle (crosshair + dashed rotating circle) positioned near the top-right. A faint dotted path trails behind the cursor showing its trajectory. The cursor slides in on mount, the reticle circle rotates slowly, and the crosshair lines pulse. Feels like AI-guided navigation.

ALSO INCLUDE these utility icons that are already used elsewhere in the app (keep them simple, they don't need to be as unique):

11. **CustomIconDownload** — A download arrow icon with a subtle bounce animation on the arrow.
12. **CustomIconTrophy** — A trophy/cup icon (used inside the hackathon section body text, not the card). Can be simple/static.
13. **CustomIconCode** — A code brackets icon (< />). Can be simple/static.

CRITICAL RULES:
- Do NOT output a generic mic, do NOT output a standard cube, do NOT output a standard star — every icon must be CONCEPTUAL and ORIGINAL
- Every icon must have at least one animation (draw-in, pulse, orbit, particle, breathe, etc)
- Use fill with very low opacity (0.04-0.15) for depth on closed shapes
- Use strokeDasharray for dashed lines to convey wireframe/holographic feel
- Use animateMotion for particle-along-path effects where specified
- The file must compile with TypeScript strict mode
- Output the COMPLETE file — no placeholders, no "...", no comments saying "similar to above"
- This is production code shipping to users`;

async function main() {
  console.log('Calling Gemini 3.1 Pro Preview to generate custom card icons...');
  console.log('This may take a minute...\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 65536,
      },
    });

    let text = response.text;
    console.log('Raw response length:', text.length, 'characters\n');

    // Extract code block if wrapped in ```tsx ... ```
    const codeBlockMatch = text.match(/```tsx\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      text = codeBlockMatch[1];
      console.log('Extracted code block:', text.length, 'characters');
    } else {
      const genericMatch = text.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
      if (genericMatch) {
        text = genericMatch[1];
        console.log('Extracted code block (generic):', text.length, 'characters');
      } else {
        console.log('No code block markers found, using raw output');
      }
    }

    const outputPath = new URL('../src/components/icons/CustomIcons.tsx', import.meta.url).pathname;
    writeFileSync(outputPath, text.trim() + '\n');
    console.log(`\nWritten to: ${outputPath}`);
    console.log('Done!');
  } catch (error) {
    console.error('Error calling Gemini:', error);
    process.exit(1);
  }
}

main();
