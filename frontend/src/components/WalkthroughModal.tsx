import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWalkthroughAgent } from '../hooks/useWalkthroughAgent.ts';

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VIOLET = 'rgba(139, 92, 246,';
const LIGHT_VIOLET = 'rgba(196, 167, 255,';

function StatusIndicator({ isConnected, isStarting }: { isConnected: boolean; isStarting: boolean }) {
  if (isStarting) {
    return <span className="text-violet-300">Connecting...</span>;
  }
  if (isConnected) {
    return (
      <>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
        </span>
        <span className="text-violet-300">Live</span>
      </>
    );
  }
  return <span className="text-slate-500">Disconnected</span>;
}

export default function WalkthroughModal({ isOpen, onClose }: WalkthroughModalProps) {
  const { isConnected, isStarting, start, stop, intensityRef } = useWalkthroughAgent();
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
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;
      const intensity = intensityRef.current;

      ctx!.clearRect(0, 0, w, h);

      const time = Date.now() / 1000;
      const ringCount = 5;

      for (let i = ringCount; i >= 0; i--) {
        const normalizedRing = i / ringCount;
        const baseRadius = 40 + i * 25;
        const pulse = intensity * 30 * (1 - normalizedRing);
        const breathe = Math.sin(time * 0.8 + i * 0.5) * 3;
        const radius = baseRadius + pulse + breathe;
        const alpha = 0.08 + intensity * 0.15 * (1 - normalizedRing);

        ctx!.beginPath();
        ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx!.strokeStyle = `${VIOLET} ${alpha})`;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      }

      const orbRadius = 30 + intensity * 40;
      const gradient = ctx!.createRadialGradient(cx, cy, 0, cx, cy, orbRadius);
      gradient.addColorStop(0, `${VIOLET} ${0.3 + intensity * 0.4})`);
      gradient.addColorStop(0.5, `${VIOLET} ${0.1 + intensity * 0.2})`);
      gradient.addColorStop(1, `${VIOLET} 0)`);

      ctx!.beginPath();
      ctx!.arc(cx, cy, orbRadius, 0, Math.PI * 2);
      ctx!.fillStyle = gradient;
      ctx!.fill();

      const coreRadius = 4 + intensity * 8;
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx!.fillStyle = `${LIGHT_VIOLET} ${0.6 + intensity * 0.4})`;
      ctx!.fill();

      animationRef.current = requestAnimationFrame(draw);
    }

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen, intensityRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={handleClose}
            aria-label="Close walkthrough"
            className="absolute top-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-all border border-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <motion.div
            className="mb-8 flex items-center gap-2 text-sm font-medium"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <StatusIndicator isConnected={isConnected} isStarting={isStarting} />
          </motion.div>

          <motion.div
            className="relative w-80 h-80 md:w-96 md:h-96"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full"
            />
          </motion.div>

          <motion.p
            className="mt-6 text-sm text-slate-500 font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Ask me anything about Voidpilot
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
