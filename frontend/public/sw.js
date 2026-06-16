// Service worker mínimo do TeamAgents (PWA instalável).
// SEM cache offline — é um app autenticado com dados ao vivo; cachear traria
// dados velhos e assets desatualizados. Aqui só habilitamos a instalação
// (Chrome exige um handler de fetch presente). Tudo passa direto pela rede.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // passthrough: não chamamos respondWith → o navegador trata normalmente.
});
