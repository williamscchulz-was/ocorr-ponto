// ============================================
// Google Drive upload (client-side, OAuth)
//
// Requer:
//  window.GOOGLE_DRIVE_CONFIG = {
//    clientId: "...apps.googleusercontent.com",
//    folderId: "ID_DA_PASTA_DO_DRIVE",  // opcional
//  }
//
// Setup no Google Cloud Console (uma vez):
//  1. https://console.cloud.google.com/apis/library/drive.googleapis.com
//     → habilitar Drive API no projeto ocorr-ponto
//  2. APIs & Services → OAuth consent screen → User Type "Internal"
//     (limita a usuários do fiobras.com.br). App name: Weave.
//  3. APIs & Services → Credentials → Create OAuth client ID
//     → Web application
//     → Authorized JavaScript origins:
//        - https://weave-fiobras.web.app
//        - https://ocorr-ponto.web.app
//        - http://localhost:9876
//     → Salva o Client ID em firebase.config.js
//
// ============================================

(function () {
  const cfg = window.GOOGLE_DRIVE_CONFIG;
  if (!cfg || !cfg.clientId || cfg.clientId.startsWith("COLE_AQUI")) {
    console.info("[Drive] sem config — usuário precisa colar URL manual no campo");
    window.driveUploadDisponivel = false;
    return;
  }
  window.driveUploadDisponivel = true;

  let gsiLoaded = null;
  function loadGSI() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (gsiLoaded) return gsiLoaded;
    gsiLoaded = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Falha ao carregar Google Identity Services"));
      document.head.appendChild(s);
    });
    return gsiLoaded;
  }

  // Cache do tokenClient — reusa pra não criar de novo a cada upload
  let tokenClient = null;
  async function getAccessToken() {
    await loadGSI();
    return new Promise((resolve, reject) => {
      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: cfg.clientId,
          scope: "https://www.googleapis.com/auth/drive.file",
          callback: (resp) => {
            if (resp.error) reject(new Error(resp.error_description || resp.error));
            else resolve(resp.access_token);
          },
        });
      } else {
        // Atualiza callback porque cada request precisa do seu próprio
        tokenClient.callback = (resp) => {
          if (resp.error) reject(new Error(resp.error_description || resp.error));
          else resolve(resp.access_token);
        };
      }
      tokenClient.requestAccessToken({ prompt: "" });
    });
  }

  /**
   * Faz upload de um File pro Drive.
   * Retorna { id, name, webViewLink }
   */
  window.uploadContratoToDrive = async function (file, opts = {}) {
    const token = await getAccessToken();
    const metadata = {
      name: opts.name || file.name,
      ...(cfg.folderId ? { parents: [cfg.folderId] } : {}),
    };
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", file);

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType,size",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error("Drive: " + t.slice(0, 300));
    }
    return res.json();
  };
})();
