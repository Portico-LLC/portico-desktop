import { Canvas } from '@react-three/fiber';
import { cn } from '@/lib/utils';
import { PorticoArchModel } from '@/components/three/PorticoArchModel';
import type { PorticoArchModelProps } from '@/components/three/PorticoArchModel';

export interface PorticoArchCanvasProps extends PorticoArchModelProps {
  className?: string;
}

/**
 * The one module that imports `three`/`@react-three/fiber` — consumers lazy
 * import this exact specifier so Vite/Rollup emits a single shared chunk
 * instead of duplicating three.js per page. No orbit/presentation controls:
 * all motion comes from the host page's own pointer/scroll refs.
 */
export function PorticoArchCanvas({ className, ...modelProps }: PorticoArchCanvasProps) {
  return (
    <div aria-hidden className={cn('pointer-events-none', className)}>
      <Canvas
        frameloop={modelProps.reduced ? 'demand' : modelProps.play ? 'always' : 'never'}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0.6, 0.5, 7.5], fov: 26, near: 0.1, far: 30 }}
      >
        <PorticoArchModel {...modelProps} />
      </Canvas>
    </div>
  );
}
