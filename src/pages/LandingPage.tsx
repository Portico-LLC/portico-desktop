import { useEffect } from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Hero } from '@/components/landing/Hero';
import { WorkflowNarrative } from '@/components/landing/WorkflowNarrative';
import { CollabBento } from '@/components/landing/CollabBento';
import { VaultBand } from '@/components/landing/VaultBand';
import { BrainCanvas } from '@/components/landing/BrainCanvas';
import { TrustLedger } from '@/components/landing/TrustLedger';
import { DownloadSection } from '@/components/landing/DownloadSection';
import { ContactSection } from '@/components/landing/ContactSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { isElectron } from '@/lib/isElectron';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';

export function LandingPage() {
  // The marketing site is deliberately out of dark-mode scope — always
  // render it in the brand's light presentation regardless of the visitor's
  // saved app preference.
  useForceLightTheme();

  // Smooth-scrolls the in-page nav anchors without opting the rest of the app
  // into smooth scrolling (chat/kanban auto-scrolls elsewhere shouldn't be
  // affected by this).
  useEffect(() => {
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = previous;
    };
  }, []);

  return (
    <div className="min-h-screen bg-bone-50">
      <LandingHeader />
      <Hero />
      <WorkflowNarrative />
      <CollabBento />
      <VaultBand />
      <BrainCanvas />
      <TrustLedger />
      {/* Nothing to download when you are already in the desktop app. */}
      {!isElectron && <DownloadSection />}
      <ContactSection />
      <LandingFooter />
    </div>
  );
}
