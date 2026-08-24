export const isElectron =
  typeof window !== 'undefined' && !!(window as any).__ELECTRON__?.isElectron;
