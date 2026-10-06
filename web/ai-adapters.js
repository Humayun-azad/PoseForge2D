/*
  Stable AI adapter boundary. Future coding AIs can replace the implementations
  without touching the editor core. No paid provider is hard-coded.
*/
window.PoseForgeAI = (() => {
  const offline = {
    id: 'offline',
    async status() { return {ready:false, reason:'No on-device model pack is bundled in v0.1'}; },
    async analyze() { throw new Error('Offline model pack not installed. See models/README.md.'); },
    async repair() { throw new Error('Offline model pack not installed. See models/README.md.'); }
  };
  async function onlineRequest(base, token, route, payload) {
    if (!base) throw new Error('Online endpoint is not configured.');
    const r = await fetch(base.replace(/\/$/,'') + route, {
      method:'POST', headers:{'Content-Type':'application/json', ...(token?{'Authorization':'Bearer '+token}:{})},
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
