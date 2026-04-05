import type { Variants, Transition } from 'framer-motion'

export const easeOut = [0.25, 0.1, 0.25, 1] as const

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: easeOut } },
}

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
}

export const slideLeft: Variants = {
  enter: { x: 50, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -50, opacity: 0 },
}

export const slideRight: Variants = {
  enter: { x: -50, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: 50, opacity: 0 },
}

export const slideStep = {
  enter: (d: number) => ({ x: d > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -50 : 50, opacity: 0 }),
}

export const stepTransition: Transition = {
  duration: 0.28,
  ease: easeOut,
}

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: easeOut } },
}

export const cardReveal: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: easeOut },
  },
}

export const hoverLift = {
  whileHover: { y: -2, transition: { duration: 0.15 } },
  whileTap: { scale: 0.98 },
}

export const popIn: Variants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: { type: 'spring', stiffness: 500, damping: 28 },
  },
}

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}
