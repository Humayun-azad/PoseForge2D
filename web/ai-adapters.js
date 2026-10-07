/*
  Stable AI adapter boundary.
  Offline mode uses the Android-native MediaPipe engine when available.
  Online mode stays provider-neutral and does not hard-code a paid API.
*/
window.PoseForgeAI = (() => {
  function nativeAvailable() {
    return !!(window.NativeBridge && typeof window.NativeBridge.offlineAnalyze === 'function');
  }

  const offline = {
    id: 'offline',
    async status() {
      if (!nativeAvailable()) return {ready:false, reason:'Native offline AI is available in the Android APK build.'};
      try { return JSON.parse(window.NativeBridge.offlineAiStatus()); }
      catch (e) { return {ready:false, reason:String(e)}; }
    },
    async analyze(payload) {
      if (!nativeAvailable()) throw new Error('Offline AI requires the Android APK build.');
      const raw = window.NativeBridge.offlineAnalyze(payload.image);
      const out = JSON.parse(raw);
      if (!out.ok) throw new Error(out.error || 'Offline AI analysis failed.');
      return out;
    },
    async repair(payload) {
      if (window.PoseForgeRepairStudio && typeof window.PoseForgeRepairStudio.offlineRepairPayload === 'function' && payload?.mask) {
        return window.PoseForgeRepairStudio.offlineRepairPayload(payload);
      }
      throw new Error('Offline local repair needs a user mask. Large missing-anatomy neural reconstruction is not bundled yet.');
    }
  };

  async function onlineRequest(base, token, route, payload) {
    if (!base) throw new Error('Online endpoint is not configured.');
    const r = await fetch(base.replace(/\/$/,'') + route, {
      method:'POST',
      headers:{'Content-Type':'application/json', ...(token?{'Authorization':'Bearer '+token}:{})},
      body:JSON.stringify(payload)
    });
    if (!r.ok) throw new Error(`AI server error ${r.status}`);
    return r.json();
  }

  const online = {
    id:'online',
    async analyze(cfg, payload){ return onlineRequest(cfg.url,cfg.token,'/analyze',payload); },
    async repair(cfg, payload){ return onlineRequest(cfg.url,cfg.token,'/reconstruct',payload); }
  };

  return {offline, online};
})();
