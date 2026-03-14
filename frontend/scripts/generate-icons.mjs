import { GoogleGenAI } from '@google/genai';
import { writeFileSync } from 'fs';

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GOOGLE_API_KEY environment variable is required');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const prompt = `You are an elite SVG icon designer and React developer. Generate a single TypeScript file containing beautiful, modern, animated SVG icon components for a dark-themed desktop AI assistant app (dark blues, cyans, indigos).

TECHNICAL REQUIREMENTS:
- Each icon is a React functional component accepting \`props: SVGProps<SVGSVGElement>\`
- Use \`motion\` from "framer-motion" for animations (import { motion } from "framer-motion")
- Import type { SVGProps } from "react"
- viewBox="0 0 24 24" for all icons
- Use "currentColor" for stroke/fill so colors are inherited via className
- strokeWidth="1.5", strokeLinecap="round", strokeLinejoin="round" as defaults
- Props should be spread onto the root SVG/motion.svg element: {...props} and className={props.className}
- Animations should be subtle, smooth, and performant (CSS-animation-like via framer-motion)
- Each component should be exported with a descriptive name

FILE STRUCTURE:
\`\`\`tsx
import type { SVGProps } from "react";
import { motion } from "framer-motion";

export function IconName(props: SVGProps<SVGSVGElement>) {
  return (
    <motion.svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props} className={props.className}>
      {/* paths */}
    </motion.svg>
  );
}
\`\`\`

NOW GENERATE THESE 18 ICONS. Be creative. Don't just recreate boring standard icons — make them unique, detailed, and alive with animation. This is for a futuristic AI desktop assistant. Go wild but keep them readable at 16-24px.

1. **GeminiShield** — A hexagonal security shield with a subtle pulsing glow animation. For a bash command approval/security gate UI. Think cyberpunk security checkpoint.

2. **GeminiClose** — An X/close icon but make it interesting. Maybe two lines that have a subtle rotation animation on mount, or the lines draw themselves in.

3. **GeminiTerminal** — A retro CRT terminal icon with a blinking cursor. Should feel like a real terminal prompt with "> _" inside a monitor shape.

4. **GeminiCheck** — A checkmark inside a circle that draws itself in with a satisfying path animation (pathLength 0→1). Feels like "approved/confirmed".

5. **GeminiStar** — A 4-pointed star constellation inspired by the Gemini brand. Multiple stars with staggered twinkle/scale animations. This is used as the main app branding icon.

6. **GeminiIrisOpen** — An eye/iris icon for "screen sharing ON". Should look like a camera aperture or iris that's open. Animated iris blades or a pulsing pupil.

7. **GeminiIrisClosed** — The same eye but closed/off state. A horizontal line where the eye was, maybe with a subtle slash through it.

8. **GeminiDisplay** — A monitor/display icon with an animated scan line sweeping across it. Futuristic display.

9. **GeminiCaret** — A chevron-down caret with a spring bounce animation. Used for expand/collapse.

10. **GeminiReticle** — A crosshair/targeting reticle with a slowly rotating outer ring. For "capture mode" — like a sniper scope or camera viewfinder.

11. **GeminiCrop** — A region selection / crop icon with dashed animated borders (dashoffset animation). For selecting a screen region.

12. **GeminiWand** — A magic wand with animated sparkle particles trailing from the tip. For "select area" action button.

13. **GeminiPulse** — An ECG/activity pulse wave. The wave path should animate like a heartbeat monitor trace. For "display info".

14. **GeminiBroadcast** — A broadcast/signal icon with radiating concentric circle waves that pulse outward and fade. For "Gemini sees" — what the AI is currently observing.

15. **GeminiBolt** — An electric lightning bolt with a subtle flash/glow animation. For "Midscene target" — where the AI will act.

16. **GeminiMicOn** — A microphone with animated sound waves emanating from it. Active/recording state. Feels alive.

17. **GeminiMicOff** — A microphone with a diagonal strike-through line. Silent/dead state. No animation.

18. **GeminiChat** — A chat bubble with animated typing dots (three dots that bounce in sequence). For "Conversation" header.

19. **GeminiSend** — A paper plane icon with a subtle launch/tilt animation. Feels like it's about to take off. For the send message button.

20. **GeminiArrowRight** — A right-pointing arrow/chevron that slides slightly right with a smooth ease. For navigation. Used at 16-20px typically.

21. **GeminiArrowLeft** — A left-pointing arrow that has a spring-back feel. For "back" navigation.

OUTPUT THE COMPLETE FILE. No placeholders, no "..." — every single path, every animation prop, fully complete. This is production code.`;

async function main() {
  console.log('Calling Gemini 3.1 Pro Preview to generate SVG icons...');
  console.log('This may take a minute...\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.8,
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
      // Try without tsx
      const genericMatch = text.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
      if (genericMatch) {
        text = genericMatch[1];
        console.log('Extracted code block (generic):', text.length, 'characters');
      } else {
        console.log('No code block markers found, using raw output');
      }
    }

    const outputPath = new URL('../src/components/icons/GeminiIcons.tsx', import.meta.url).pathname;
    writeFileSync(outputPath, text.trim() + '\n');
    console.log(`\nWritten to: ${outputPath}`);
    console.log('Done!');
  } catch (error) {
    console.error('Error calling Gemini:', error);
    process.exit(1);
  }
}

main();
