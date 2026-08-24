import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HeroArch } from '@/components/brand/HeroArch';
import { DashboardScene } from '@/components/landing/scenes/DashboardScene';
import { useSceneVisibility } from '@/lib/motion/useSceneVisibility';

/** The headline, split so each line can arrive on its own depth beat. */
const HEADLINE = ['The front door between', 'studio and client.'];

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
      <HeroArch reduce={reduce} />

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-12 px-6 pb-16 pt-24 lg:grid-cols-[minmax(0,46ch)_1fr] lg:gap-6">
        <div>
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-pine-800 bg-pine-950 px-2.5 py-1 text-[11px] font-medium text-pine-200"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-moss-400" />
            Now in private beta
          </motion.span>

          <h1 className="mt-5 max-w-[16ch] font-display font-medium leading-[1.08] tracking-[-0.02em] text-bone-50 text-[clamp(38px,5vw,60px)]">
            {HEADLINE.map((line, i) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={reduce ? false : { opacity: 0, y: '100%' }}
                  animate={{ opacity: 1, y: '0%' }}
                  transition={{ duration: 0.6, ease: [0.2, 0, 0, 1], delay: 0.1 + i * 0.09 }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0, 0, 1], delay: 0.32 }}
            className="mt-5 max-w-md text-base leading-relaxed text-ink-300"
          >
            Projects, tasks, invoices, chat, and secrets. One calm workspace your clients can
            actually use.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0, 0, 1], delay: 0.42 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
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
                className="w-full border-ink-700 text-bone-50 hover:border-ink-600 hover:bg-ink-900 sm:w-auto"
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
          className="mx-auto w-full max-w-lg lg:max-w-none lg:translate-x-[6%]"
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
