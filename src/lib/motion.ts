export const motionEase = [0.22, 1, 0.36, 1] as const;

export const viewportOnce = {
  once: true,
  amount: 0.12,
} as const;

export const createStaggerContainer = (staggerChildren = 0.1, delayChildren = 0) => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: Math.min(delayChildren, 0.02),
      staggerChildren: Math.min(staggerChildren, 0.055),
      ease: motionEase,
    },
  },
});

export const sectionReveal = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: motionEase,
    },
  },
};

export const itemReveal = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: motionEase,
    },
  },
};

export const hoverLift = {
  y: -3,
  scale: 1.004,
  transition: {
    duration: 0.18,
    ease: motionEase,
  },
};

export const tapPress = {
  scale: 0.992,
  transition: {
    duration: 0.12,
    ease: motionEase,
  },
};

export const buttonHover = {
  y: -1,
  scale: 1.004,
  transition: {
    duration: 0.16,
    ease: motionEase,
  },
};