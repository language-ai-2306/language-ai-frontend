/** Cheap one-off check for WebGL support (to pick 3D vs the SVG fallback). */
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return (
      Boolean(window.WebGLRenderingContext) &&
      Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}
