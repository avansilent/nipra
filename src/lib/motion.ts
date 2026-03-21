export const motionEase = [0.22, 1, 0.36, 1] as const;

export const viewportOnce = {
  once: true,
  amount: 0.18,
} as const;

export const createStaggerContainer = (staggerChildren = 0.1, delayChildren = 0) => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren,
      staggerChildren,
      ease: motionEase,
    },
  },
});

export const sectionReveal = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.72,
      ease: motionEase,
    },
  },
};

export const itemReveal = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.56,
      ease: motionEase,
    },
  },
};

export const hoverLift = {
  y: -6,
  scale: 1.012,
  transition: {
    duration: 0.24,
    ease: motionEase,
  },
};

export const tapPress = {
  scale: 0.985,
  transition: {
    duration: 0.16,
    ease: motionEase,
  },
};

export const buttonHover = {
  y: -2,
  scale: 1.01,
  transition: {
    duration: 0.2,
    ease: motionEase,
  },
};