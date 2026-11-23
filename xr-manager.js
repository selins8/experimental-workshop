export class XRManager {
  constructor(renderer, callbacks = {}) {
    this.renderer = renderer;
    this.callbacks = callbacks;
    this.session = null;
    this.supported = false;
  }

  async checkSupport() {
    if (!('xr' in navigator)) {
      this.supported = false;
      return { supported: false, reason: 'WebXR API bu tarayıcıda bulunmuyor.' };
    }

    try {
      this.supported = await navigator.xr.isSessionSupported('immersive-vr');
      if (!this.supported) {
        return { supported: false, reason: 'Cihaz immersive-vr oturumunu desteklemiyor.' };
      }
      return { supported: true, reason: '' };
    } catch (err) {
      this.supported = false;
      return { supported: false, reason: `WebXR kontrol hatası: ${err.message}` };
    }
  }

  async enterVR() {
    if (this.session) {
      await this.session.end();
      return;
    }

    const sessionInit = {
      optionalFeatures: ['hand-tracking', 'local-floor', 'bounded-floor']
    };

    const session = await navigator.xr.requestSession('immersive-vr', sessionInit);
    this.session = session;

    try {
      this.renderer.xr.setReferenceSpaceType('local-floor');
    } catch {
      this.renderer.xr.setReferenceSpaceType('local');
    }

    session.addEventListener('end', () => {
      this.session = null;
      this.callbacks.onSessionEnd?.();
    });

    await this.renderer.xr.setSession(session);

    const hasHandTracking =
      Array.isArray(session.enabledFeatures)
        ? session.enabledFeatures.includes('hand-tracking')
        : true;

    this.callbacks.onSessionStart?.({ session, hasHandTracking });
  }

  isPresenting() {
    return Boolean(this.session && this.renderer.xr.isPresenting);
  }
}
