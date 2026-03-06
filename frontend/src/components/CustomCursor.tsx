import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function CustomCursor() {
    const [isHovered, setIsHovered] = useState(false);
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    // Smooth springs for the outer ring trailing effect
    const springConfig = { damping: 25, stiffness: 250, mass: 0.5 };
    const cursorXSpring = useSpring(cursorX, springConfig);
    const cursorYSpring = useSpring(cursorY, springConfig);

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Triggers expansion if hovering over buttons, links, or customized elements
            if (
                target.tagName.toLowerCase() === 'button' ||
                target.tagName.toLowerCase() === 'a' ||
                target.closest('button') ||
                target.closest('a') ||
                target.closest('.group')
            ) {
                setIsHovered(true);
            } else {
                setIsHovered(false);
            }
        };

        window.addEventListener('mousemove', moveCursor);
        window.addEventListener('mouseover', handleMouseOver);

        return () => {
            window.removeEventListener('mousemove', moveCursor);
            window.removeEventListener('mouseover', handleMouseOver);
        };
    }, [cursorX, cursorY]);

    // Hide the default cursor completely via CSS globally in index.css

    return (
        <>
            {/* Inner dot - instant follow */}
            <motion.div
                className="fixed top-0 left-0 w-2 h-2 bg-sky-400 rounded-full pointer-events-none z-[100] mix-blend-screen shadow-[0_0_10px_2px_rgba(56,189,248,0.8)]"
                style={{
                    x: cursorX,
                    y: cursorY,
                    translateX: '-50%',
                    translateY: '-50%',
                }}
                animate={{
                    scale: isHovered ? 0 : 1,
                    opacity: isHovered ? 0 : 1
                }}
                transition={{ duration: 0.2 }}
            />

            {/* Outer ring - smoothly trails and expands on hover */}
            <motion.div
                className="fixed top-0 left-0 w-8 h-8 rounded-full border border-sky-400/50 pointer-events-none z-[99] mix-blend-screen flex items-center justify-center bg-sky-500/10 backdrop-blur-[2px]"
                style={{
                    x: cursorXSpring,
                    y: cursorYSpring,
                    translateX: '-50%',
                    translateY: '-50%',
                }}
                animate={{
                    scale: isHovered ? 2.5 : 1,
                    borderColor: isHovered ? 'rgba(56, 189, 248, 0.8)' : 'rgba(56, 189, 248, 0.5)',
                    backgroundColor: isHovered ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.05)',
                }}
                transition={{ duration: 0.2 }}
            />
        </>
    );
}
