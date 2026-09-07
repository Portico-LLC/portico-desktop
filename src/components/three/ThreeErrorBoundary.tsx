import { Component } from 'react';
import type { ReactNode } from 'react';

interface ThreeErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ThreeErrorBoundaryState {
  failed: boolean;
}

/**
 * Catches any render-time throw from the R3F tree (context loss mid-session,
 * driver quirks) and swaps to the flat SVG fallback instead of blanking the
 * section. Belt-and-suspenders alongside `useWebglSupported`'s upfront probe.
 */
export class ThreeErrorBoundary extends Component<ThreeErrorBoundaryProps, ThreeErrorBoundaryState> {
  state: ThreeErrorBoundaryState = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) {
      console.warn('PorticoArchCanvas failed, falling back to flat art:', error);
    }
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}
