import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function CustomCursor() {
    const [isHovered, setIsHovered] = useState(false);
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    const springConfig = { damping: 30, stiffness: 300, mass: 0.4 };
    const cursorXSpring = useSpring(cursorX, springConfig);
    const cursorYSpring = useSpring(cursorY, springConfig);

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
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

    return (
        <>
            {/* Minimal dot — follows instantly */}
            <motion.div
                className="fixed top-0 left-0 size-1.5 rounded-full bg-amber-400 pointer-events-none z-[100] mix-blend-screen"
                style={{
                    x: cursorX,
                    y: cursorY,
                    translateX: '-50%',
                    translateY: '-50%',
                    boxShadow: '0 0 8px 1px rgba(217,119,6,0.6)',
                }}
                animate={{
                    scale: isHovered ? 0 : 1,
                    opacity: isHovered ? 0 : 0.9,
                }}
                transition={{ duration: 0.15 }}
            />

            {/* Subtle ring — trails slightly, expands on interactive elements */}
            <motion.div
                className="fixed top-0 left-0 size-7 rounded-full pointer-events-none z-[99] mix-blend-screen"
                style={{
                    x: cursorXSpring,
                    y: cursorYSpring,
                    translateX: '-50%',
                    translateY: '-50%',
                    border: '1px solid rgba(217,119,6,0.25)',
                }}
                animate={{
                    scale: isHovered ? 2.2 : 1,
                    borderColor: isHovered ? 'rgba(217,119,6,0.5)' : 'rgba(217,119,6,0.25)',
                    backgroundColor: isHovered ? 'rgba(217,119,6,0.08)' : 'rgba(217,119,6,0.02)',
                }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
            />
        </>
    );
}
