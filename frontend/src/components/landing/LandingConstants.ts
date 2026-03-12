export type SectionId = 'index' | 'hero' | 'capabilities' | 'hackathon';

export const SECTION_SCROLL_MAP: Record<SectionId, number> = {
  index: 0,
  hero: 0,
  capabilities: 1,
  hackathon: 2,
};

export const EASE = [0.22, 1, 0.36, 1] as const;

export const sectionVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 40, filter: 'blur(8px)' },
  visible: {
    opacity: 1, scale: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.4, ease: EASE },
  },
  exit: {
    opacity: 0, scale: 0.95, y: -30, filter: 'blur(6px)',
    transition: { duration: 0.2, ease: EASE },
  },
};

export const indexCardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.05, duration: 0.3, ease: EASE },
  }),
  exit: (i: number) => ({
    opacity: 0, scale: 0.85, y: -20,
    transition: { delay: i * 0.02, duration: 0.15, ease: EASE },
  }),
};
