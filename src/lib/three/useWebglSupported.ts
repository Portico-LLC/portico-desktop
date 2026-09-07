import { useState } from 'react';

function probeWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Client-only WebGL capability check. Consumers must gate `<Canvas>` mounting
 * on this — a failed WebGL context creation otherwise throws/logs from deep
 * inside three.js/@react-three/fiber instead of degrading cleanly.
 */
export function useWebglSupported(): boolean {
  const [supported] = useState(probeWebgl);
  return supported;
}
