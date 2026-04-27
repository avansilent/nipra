export const motionEase = [0.22, 1, 0.36, 1] as const;

export const viewportOnce = {
  once: true,
  amount: 0.12,
} as const;

export const createStaggerContainer = (staggerChildren = 0.1, delayChildren = 0) => ({
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: Math.min(delayChildren, 0.08),
      staggerChildren: Math.min(staggerChildren, 0.09),
      ease: motionEase,
    },
  },
});

export const sectionReveal = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.52,
      ease: motionEase,
    },
  },
};

export const balancedSectionReveal = {
  hidden: { opacity: 1, y: 0 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.01,
      ease: motionEase,
    },
  },
};

export const itemReveal = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.34,
      ease: motionEase,
    },
  },
};

export const balancedItemReveal = {
  hidden: { opacity: 1, y: 0 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.01,
      ease: motionEase,
    },
  },
};

export const hoverLift = {
  y: 0,
  scale: 1,
  transition: {
    duration: 0.26,
    ease: motionEase,
  },
};

export const tapPress = {
  scale: 0.999,
  transition: {
    duration: 0.18,
    ease: motionEase,
  },
};

export const buttonHover = {
  y: 0,
  scale: 1,
  transition: {
    duration: 0.26,
    ease: motionEase,
  },
};
