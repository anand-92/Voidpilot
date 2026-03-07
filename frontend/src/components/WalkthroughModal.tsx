import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalkthroughAgent } from '../hooks/useWalkthroughAgent';

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalkthroughModal({ isOpen, onClose }: WalkthroughModalProps) {
  const { isConnected, isStarting, start, stop, intensityRef } = useWalkthroughAgent();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const handleClose = useCallback(() => {
    stop();
    onClose();
  }, [stop, onClose]);

  // Start session when modal opens
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

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Canvas animation for audio-reactive orb
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;
      const intensity = intensityRef.current;

      ctx.clearRect(0, 0, w, h);

      const time = Date.now() / 1000;
      const rings = 5;

      for (let i = rings; i >= 0; i--) {
        const baseRadius = 40 + i * 25;
        const pulse = intensity * 30 * (1 - i / rings);
        const breathe = Math.sin(time * 0.8 + i * 0.5) * 3;
        const radius = baseRadius + pulse + breathe;

        const alpha = 0.08 + intensity * 0.15 * (1 - i / rings);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Inner glow orb
      const orbRadius = 30 + intensity * 40;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbRadius);
      gradient.addColorStop(0, `rgba(139, 92, 246, ${0.3 + intensity * 0.4})`);
      gradient.addColorStop(0.5, `rgba(139, 92, 246, ${0.1 + intensity * 0.2})`);
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

      ctx.beginPath();
      ctx.arc(cx, cy, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core dot
      const coreRadius = 4 + intensity * 8;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(196, 167, 255, ${0.6 + intensity * 0.4})`;
      ctx.fill();

      animationRef.current = requestAnimationFrame(draw);
    };

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
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-all border border-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Status */}
          <motion.div
            className="mb-8 flex items-center gap-2 text-sm font-medium"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {isStarting && (
              <span className="text-violet-300">Connecting...</span>
            )}
            {isConnected && !isStarting && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
                </span>
                <span className="text-violet-300">Live</span>
              </>
            )}
            {!isConnected && !isStarting && (
              <span className="text-slate-500">Disconnected</span>
            )}
          </motion.div>

          {/* Audio-reactive canvas */}
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

          {/* Tagline */}
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
