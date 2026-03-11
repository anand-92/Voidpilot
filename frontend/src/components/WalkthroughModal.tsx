import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { useWalkthroughAgent } from '../hooks/useWalkthroughAgent.ts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShineBorder } from '@/components/ui/shine-border';
import { Particles } from '@/components/ui/particles';

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AMBER = 'rgba(217, 119, 6,';
const GOLD = 'rgba(251, 191, 36,';

function StatusIndicator({ isConnected, isStarting }: { isConnected: boolean; isStarting: boolean }) {
  if (isStarting) {
    return (
      <Badge variant="outline" className="h-auto gap-2 rounded-full border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-300">
        Connecting...
      </Badge>
    );
  }
  if (isConnected) {
    return (
      <Badge variant="outline" className="h-auto gap-2 rounded-full border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-300">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
        </span>
        Live
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-auto rounded-full border-stone-700 bg-stone-800/60 px-3 py-1.5 text-stone-500">
      Disconnected
    </Badge>
  );
}

export default function WalkthroughModal({ isOpen, onClose }: WalkthroughModalProps) {
  const { isConnected, isStarting, start, stop, inputIntensityRef, outputIntensityRef, visualIntensityRef } =
    useWalkthroughAgent();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const handleClose = useCallback(() => {
    stop();
    onClose();
  }, [stop, onClose]);

  useEffect(() => {
    if (isOpen) {
      start().catch((err: unknown) => {
        console.error('Failed to start walkthrough:', err);
      });
    }
    return () => {
      stop();
    };
  }, [isOpen, start, stop]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      canvas!.width = canvas!.offsetWidth * window.devicePixelRatio;
      canvas!.height = canvas!.offsetHeight * window.devicePixelRatio;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;
      const intensity = visualIntensityRef.current;
      const inputIntensity = inputIntensityRef.current;
      const outputIntensity = outputIntensityRef.current;

      ctx!.clearRect(0, 0, w, h);

      const time = Date.now() / 1000;
      const ringCount = 5;

      for (let i = ringCount; i >= 0; i--) {
        const normalizedRing = i / ringCount;
        const baseRadius = 40 + i * 25;
        const pulse = intensity * 30 * (1 - normalizedRing);
        const breathe = Math.sin(time * 0.8 + i * 0.5) * 3;
        const radius = baseRadius + pulse + breathe;
        const alpha = 0.06 + intensity * 0.12 * (1 - normalizedRing);

        ctx!.beginPath();
        ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx!.strokeStyle = `${AMBER} ${alpha})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      const orbRadius = 30 + intensity * 40;
      const gradient = ctx!.createRadialGradient(cx, cy, 0, cx, cy, orbRadius);
      gradient.addColorStop(0, `${AMBER} ${0.3 + intensity * 0.4})`);
      gradient.addColorStop(0.5, `${AMBER} ${0.1 + intensity * 0.2})`);
      gradient.addColorStop(1, `${AMBER} 0)`);

      ctx!.beginPath();
      ctx!.arc(cx, cy, orbRadius, 0, Math.PI * 2);
      ctx!.fillStyle = gradient;
      ctx!.fill();

      const coreRadius = 4 + intensity * 8;
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx!.fillStyle = `${GOLD} ${0.6 + intensity * 0.4})`;
      ctx!.fill();

      const meterWidth = Math.min(44, w * 0.12);
      const meterGap = Math.min(40, w * 0.08);
      const meterBaseHeight = h * 0.34;
      const maxMeterHeight = h * 0.5;
      const meterY = cy;
      const meters = [
        { label: 'You', intensity: inputIntensity, x: cx - meterGap - meterWidth },
        { label: 'Gemini', intensity: outputIntensity, x: cx + meterGap },
      ];

      meters.forEach(({ label, intensity: meterIntensity, x }) => {
        const activeHeight = meterBaseHeight + meterIntensity * (maxMeterHeight - meterBaseHeight);
        const top = meterY - activeHeight / 2;
        const meterGradient = ctx!.createLinearGradient(0, top, 0, top + activeHeight);
        meterGradient.addColorStop(0, `${GOLD} ${0.85 - meterIntensity * 0.1})`);
        meterGradient.addColorStop(1, `${AMBER} ${0.16 + meterIntensity * 0.42})`);

        ctx!.fillStyle = `${AMBER} 0.06)`;
        ctx!.beginPath();
        ctx!.roundRect(x, meterY - maxMeterHeight / 2, meterWidth, maxMeterHeight, 18);
        ctx!.fill();

        ctx!.fillStyle = meterGradient;
        ctx!.beginPath();
        ctx!.roundRect(x, top, meterWidth, activeHeight, 18);
        ctx!.fill();

        ctx!.fillStyle = `rgba(251, 191, 36, ${0.72 + meterIntensity * 0.18})`;
        ctx!.font = '600 12px "DM Sans", Inter, sans-serif';
        ctx!.textAlign = 'center';
        ctx!.fillText(label, x + meterWidth / 2, meterY + maxMeterHeight / 2 + 24);
      });

      animationRef.current = requestAnimationFrame(draw);
    }

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen, inputIntensityRef, outputIntensityRef, visualIntensityRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-950/95 backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Particles background */}
          <Particles
            className="absolute inset-0"
            quantity={40}
            color="#d97706"
            size={0.3}
            staticity={60}
            ease={60}
          />

          <Button
            variant="ghost"
            size="icon-lg"
            onClick={handleClose}
            aria-label="Close walkthrough"
            className="absolute top-6 right-6 z-10 rounded-full border border-stone-700 bg-stone-800/60 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
          >
            <XIcon />
          </Button>

          <motion.div
            className="mb-8 flex items-center gap-2 text-sm font-medium"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <StatusIndicator isConnected={isConnected} isStarting={isStarting} />
          </motion.div>

          <motion.div
            className="relative size-80 md:size-96 rounded-full"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <ShineBorder
              shineColor={['#d97706', '#fbbf24', '#92400e']}
              borderWidth={2}
              duration={10}
            />
            <canvas
              ref={canvasRef}
              className="size-full"
            />
          </motion.div>

          <motion.p
            className="mt-6 text-sm text-stone-500 font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Speak naturally — left meter is you, right meter is Gemini
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
