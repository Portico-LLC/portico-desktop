export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
}

// Draws `video` into the (dx, dy, dw, dh) rect, cropping it (not squashing it)
// to fill the rect — the canvas equivalent of CSS `object-fit: cover`.
export function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  const targetRatio = dw / dh;
  const sourceRatio = vw / vh;
  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;
  if (sourceRatio > targetRatio) {
    sw = vh * targetRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / targetRatio;
    sy = (vh - sh) / 2;
  }
  ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
}

const CANDIDATE_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export function pickSupportedMimeType(): string {
  for (const candidate of CANDIDATE_MIME_TYPES) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return 'video/webm';
}
