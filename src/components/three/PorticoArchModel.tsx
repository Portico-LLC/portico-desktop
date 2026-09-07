import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * The Portico doorway, built procedurally from primitives (no imported mesh) —
 * three receding "archivolt" bands nested like the mouldings around a real
 * doorway, flanked by pillars and standing on a brass threshold. Proportions
 * echo the flat line-art in `ArchMotif`/`HeroArch` (same three-band, Pine ×2 +
 * Brass innermost read), rebuilt as real geometry so it has an actual front,
 * depth, and light response instead of stroked paths.
 */

export type TiltRef = MutableRefObject<{ x: number; y: number }>;
export type ScrollRef = MutableRefObject<number>;

export interface PorticoArchModelProps {
  /** Pointer offset (-0.5..0.5 on each axis), updated externally each frame — drives a cursor-reactive tilt. */
  tiltRef?: TiltRef;
  /** Scroll progress (0..1) within the host section, updated externally — drives a real Z-dolly + yaw drift. */
  scrollRef?: ScrollRef;
  /** Slow autonomous sway + bob so the piece is alive with zero input. Default true. */
  idle?: boolean;
  /** Freeze at one fixed pose, ignore tilt/scroll/idle — the reduced-motion contract. */
  reduced: boolean;
  /** Off-screen/tab-hidden/reduced-motion gate — short-circuits all per-frame work when false. */
  play: boolean;
  /** Multiplies every light's intensity — a per-context tuning knob (Hero vs. Auth panel). */
  dim?: number;
}

// Brand hexes lifted from the already-tuned arch-motif palette (HeroArch.tsx /
// ArchMotif.tsx), not the generic DESIGN.md swatch table — this is the
// established convention specifically for this motif.
const PINE_DARK = '#1E4134'; // pillars: grounded, structural
const PINE_MID_BRIGHT = '#3C7D63'; // ring 1 (outermost, frontmost)
const PINE_MID = '#2C6350'; // fill light tint only — ring 2 uses PINE_DARK, see below
// Ring 3 + plinth use a lightened brass (#C68A42, not the flat-art #B77B33)
// with a warm emissive floor — a lit 3D surface needs more headroom than a
// flat CSS swatch to still read as "gold" rather than "brown" once shaded.

const STATIC_YAW = -0.22; // the fixed pose rendered under `reduced` — a pleasant 3/4 angle, not head-on

interface ArchDims {
  halfWidth: number;
  jambHeight: number;
  apexHeight: number;
}

/**
 * Arch silhouette as a closed outline: straight squared jambs rising from the
 * baseline (y=0), joined by a half-ellipse dome (independent width/height
 * radii, so the apex can be taller than a true semicircle without resorting
 * to hand-tuned bezier control points — "Geometric", per the mark spec).
 */
function archOutline(d: ArchDims, segments = 28): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  pts.push(new THREE.Vector2(-d.halfWidth, 0));
  pts.push(new THREE.Vector2(-d.halfWidth, d.jambHeight));
  for (let i = 0; i <= segments; i++) {
    const theta = Math.PI - (Math.PI * i) / segments;
    pts.push(new THREE.Vector2(d.halfWidth * Math.cos(theta), d.jambHeight + d.apexHeight * Math.sin(theta)));
  }
  pts.push(new THREE.Vector2(d.halfWidth, 0));
  return pts;
}

/** One "archivolt" band: an arch-shaped frame with a smaller arch punched out as a hole, extruded with a light bevel. */
function buildRingGeometry(outer: ArchDims, inner: ArchDims, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape(archOutline(outer));
  shape.holes.push(new THREE.Path(archOutline(inner)));
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    // Small enough to only kill hard CAD edges under the key light — not a stylistic chamfer.
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 20,
  });
}

const RING_DEPTH = 0.22;
const RING_Z_STEP = 0.2; // recession between ring front faces

// Four nested arch profiles: ring N's hole is exactly ring (N+1)'s outer
// boundary, so the bands are guaranteed to nest flush with no clipping —
// each is simply "outer = GEN[i], hole = GEN[i+1]". GEN[3] is never built as
// a ring itself: it's the innermost aperture, left open so the panel's own
// dark background shows through, like an actual doorway.
const GEN: ArchDims[] = [
  { halfWidth: 1.0, jambHeight: 1.2, apexHeight: 0.9 },
  { halfWidth: 0.78, jambHeight: 0.98, apexHeight: 0.7 },
  { halfWidth: 0.56, jambHeight: 0.76, apexHeight: 0.5 },
  { halfWidth: 0.38, jambHeight: 0.58, apexHeight: 0.36 },
];

function buildGeometry() {
  const ring1Geo = buildRingGeometry(GEN[0], GEN[1], RING_DEPTH);
  const ring2Geo = buildRingGeometry(GEN[1], GEN[2], RING_DEPTH);
  const ring3Geo = buildRingGeometry(GEN[2], GEN[3], RING_DEPTH);

  const ring1Z = 0.2;
  const ring2Z = ring1Z - RING_Z_STEP;
  const ring3Z = ring2Z - RING_Z_STEP;

  // Pillars stand fully beside the outermost band (a small gap, not
  // overlapping it) so they read as flanking columns, not a fused blob.
  const pillarWidth = 0.22;
  const pillarDepth = 0.34;
  const pillarHeight = GEN[0].jambHeight;
  const pillarGap = 0.05;
  const pillarGeo = new THREE.BoxGeometry(pillarWidth, pillarHeight, pillarDepth);
  const pillarX = GEN[0].halfWidth + pillarWidth / 2 + pillarGap;
  const pillarZ = ring1Z + RING_DEPTH / 2;

  const plinthWidth = (pillarX + pillarWidth / 2) * 2 + 0.2;
  const plinthHeight = 0.12;
  const plinthDepth = ring1Z + RING_DEPTH - ring3Z + 0.3;
  const plinthGeo = new THREE.BoxGeometry(plinthWidth, plinthHeight, plinthDepth);
  const plinthZ = ring3Z - 0.15 + plinthDepth / 2;

  return {
    ring1Geo,
    ring2Geo,
    ring3Geo,
    pillarGeo,
    plinthGeo,
    ring1Z,
    ring2Z,
    ring3Z,
    pillarX,
    pillarZ,
    pillarHeight,
    plinthZ,
    plinthHeight,
  };
}

export function PorticoArchModel({ tiltRef, scrollRef, idle = true, reduced, play, dim = 1 }: PorticoArchModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const geo = useMemo(buildGeometry, []);

  // Ring 1 (bright, frontmost) -> ring 2 (dark) is a deliberate value jump —
  // two adjacent green rings that are too close in lightness read as one
  // fused mass instead of receding bands.
  const pineDark = useMemo(() => new THREE.MeshStandardMaterial({ color: PINE_DARK, roughness: 0.85, metalness: 0.04 }), []);
  const pineMidBright = useMemo(
    () => new THREE.MeshStandardMaterial({ color: PINE_MID_BRIGHT, roughness: 0.85, metalness: 0.04 }),
    []
  );
  // Never drop roughness below ~0.4 or raise metalness above ~0.5 here —
  // DESIGN.md: Brass is "never shiny chrome". A small emissive floor keeps
  // the innermost ring legible as brass at every rotation angle, not just
  // the ones where a light happens to catch it.
  const brass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#C68A42',
        roughness: 0.5,
        metalness: 0.45,
        emissive: '#4A2E12',
        emissiveIntensity: 0.65,
      }),
    []
  );

  useEffect(
    () => () => {
      geo.ring1Geo.dispose();
      geo.ring2Geo.dispose();
      geo.ring3Geo.dispose();
      geo.pillarGeo.dispose();
      geo.plinthGeo.dispose();
      pineDark.dispose();
      pineMidBright.dispose();
      brass.dispose();
    },
    [geo, pineDark, pineMidBright, brass]
  );

  const baseY = -1;

  // Aim explicitly at the model's center rather than relying on the
  // Canvas's default camera orientation — keeps framing correct regardless
  // of how the camera position/offset is tuned below.
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group || !play) return;

    if (reduced) {
      group.rotation.set(0, STATIC_YAW, 0);
      group.position.set(0, baseY, 0);
      return;
    }

    const t = state.clock.elapsedTime;
    // Slow ±7° yaw sway over ~40s — deliberately not a full spin, which would
    // read as a product-demo turntable rather than a brand mark.
    const sway = idle ? Math.sin(t * 0.16) * 0.12 : 0;
    const bob = idle ? Math.sin(t * 0.4) * 0.025 : 0;
    const tilt = tiltRef?.current;
    const tiltYaw = tilt ? tilt.x * 0.28 : 0;
    const tiltPitch = tilt ? tilt.y * -0.18 : 0;
    const scrollP = scrollRef?.current ?? 0;

    group.rotation.y = STATIC_YAW + sway + tiltYaw + scrollP * 0.15;
    group.rotation.x = tiltPitch;
    group.position.y = baseY + bob;
    group.position.z = scrollP * -1.2;
  });

  return (
    <group ref={groupRef} position={[0, baseY, 0]}>
      <directionalLight color="#F6F4EF" intensity={1.1 * dim} position={[2.5, 3.5, 4]} />
      <directionalLight color={PINE_MID} intensity={0.25 * dim} position={[-3, 0.5, 2]} />
      {/* Camera-side (positive Z), not behind the model — a light placed
          behind only grazes the back faces we never see, leaving the
          brass ring's front face unlit. */}
      <pointLight color="#DFB877" intensity={0.7 * dim} position={[-1.6, 1.3, 3.4]} />
      <hemisphereLight args={['#2A2822', '#12110E', 0.35 * dim]} />

      <mesh geometry={geo.ring1Geo} material={pineMidBright} position={[0, 0, geo.ring1Z]} />
      <mesh geometry={geo.ring2Geo} material={pineDark} position={[0, 0, geo.ring2Z]} />
      <mesh geometry={geo.ring3Geo} material={brass} position={[0, 0, geo.ring3Z]} />

      <mesh geometry={geo.pillarGeo} material={pineDark} position={[-geo.pillarX, geo.pillarHeight / 2, geo.pillarZ]} />
      <mesh geometry={geo.pillarGeo} material={pineDark} position={[geo.pillarX, geo.pillarHeight / 2, geo.pillarZ]} />

      <mesh geometry={geo.plinthGeo} material={brass} position={[0, -geo.plinthHeight / 2, geo.plinthZ]} />
    </group>
  );
}
