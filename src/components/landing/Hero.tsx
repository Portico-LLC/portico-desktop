import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HeroSceneBackdrop } from '@/components/landing/HeroSceneBackdrop';
import { DashboardScene } from '@/components/landing/scenes/DashboardScene';
import { useSceneVisibility } from '@/lib/motion/useSceneVisibility';

export function Hero() {
  const reduce = !!useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { ref: sceneRef, play } = useSceneVisibility<HTMLDivElement>();

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  // Scrolling dollies the stage back rather than sliding it down: it keeps the
  // 3D reading of the section instead of flattening into a parallax slab.
  const sceneZ = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -220]);
  const sceneOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden bg-ink-950 text-bone-50"
    >
      <HeroSceneBackdrop reduce={reduce} play={play} scrollYProgress={scrollYProgress} />

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-12 px-6 pb-16 pt-24 lg:grid-cols-[minmax(0,46ch)_1fr] lg:gap-6">
        <div className="self-end">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0, 0, 1], delay: 0.15 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Link to="/signup" className="group w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                Get Started
                <ArrowRight
                  size={16}
                  className="transition-transform duration-hover ease-brand group-hover:translate-x-1"
                />
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full border-ink-700 bg-ink-950/60 text-bone-50 backdrop-blur-sm hover:border-ink-600 hover:bg-ink-900 sm:w-auto"
              >
                Sign in
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* The diorama bleeds past the container on wide viewports so the
            composition reads as staged rather than as a centered template. */}
        <motion.div
          ref={sceneRef}
          style={reduce ? undefined : { z: sceneZ, opacity: sceneOpacity }}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0, 0, 1], delay: 0.2 }}
          className="mx-auto w-full max-w-lg lg:max-w-none lg:translate-x-[20%]"
        >
          <DashboardScene play={play} />
        </motion.div>
      </div>

      {/* Angled seam into the light section below. */}
      <svg
        aria-hidden
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className="absolute -bottom-px left-0 h-[60px] w-full text-bone-50"
      >
        <path d="M0 60 L1440 20 L1440 60 Z" fill="currentColor" />
      </svg>
    </section>
  );
}
