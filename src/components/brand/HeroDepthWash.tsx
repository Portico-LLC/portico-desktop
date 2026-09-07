/** The Hero's ambient depth wash — extracted verbatim from `HeroArch` so both
 *  the flat fallback and the 3D backdrop can share it without duplicating the
 *  gradient tuning. */
export function HeroDepthWash() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(70% 60% at 72% 30%, rgba(183,123,51,0.13) 0%, transparent 62%), radial-gradient(55% 55% at 12% 88%, rgba(60,125,99,0.16) 0%, transparent 68%)',
      }}
    />
  );
}
