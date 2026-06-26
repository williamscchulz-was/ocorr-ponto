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
//     (limita a usuários do fiobras.com.br). App name: FioPulse.
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
  // Cache do access token — evita popup duplo no mesmo fluxo (ex: upload + OCR).
  // Tokens GIS duram 1h. Margem de 1 min pra evitar race com expiração.
  let cachedToken = null;
  let cachedTokenExpiresAt = 0;

  // Expõe estado pra UI: token válido em cache?
  window.driveTokenEmCache = function () {
    return !!cachedToken && Date.now() < cachedTokenExpiresAt - 60000;
  };

  // Aquece o token explicitamente, em contexto de clique direto do user.
  // Evita popup bloqueado pelo browser quando o getAccessToken só seria
  // chamado após múltiplos await (fora de user activation).
  window.preAquecerTokenDrive = async function () {
    return getAccessToken();
  };

  async function getAccessToken() {
    await loadGSI();

    // Reusa token se ainda válido (não dispara novo popup)
    if (cachedToken && Date.now() < cachedTokenExpiresAt - 60000) {
      return cachedToken;
    }

    return new Promise((resolve, reject) => {
      const onSuccess = (resp) => {
        if (typeof debug === "function") debug("[Drive] OAuth success");
        if (resp.error) {
          console.error("[Drive] callback error:", resp);
          reject(new Error(resp.error_description || resp.error));
        } else {
          cachedToken = resp.access_token;
          // resp.expires_in vem em segundos
          cachedTokenExpiresAt = Date.now() + ((resp.expires_in || 3600) * 1000);
          resolve(resp.access_token);
        }
      };
      const onError = (err) => {
        console.error("[Drive] OAuth error:", err);
        const msg = err?.type === "popup_closed"
          ? "Popup do Google foi fechado antes de autorizar."
          : err?.type === "popup_failed_to_open"
          ? "Browser bloqueou o popup. Permita popups para este site e tente de novo."
          : (err?.message || err?.type || "Erro desconhecido no OAuth. Verifique se você foi adicionado como 'Test user' no console Google Cloud.");
        reject(new Error(msg));
      };

      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: cfg.clientId,
          scope: "https://www.googleapis.com/auth/drive.file",
          callback: onSuccess,
          error_callback: onError,
        });
      } else {
        tokenClient.callback = onSuccess;
        tokenClient.error_callback = onError;
      }
      if (typeof debug === "function") debug("[Drive] solicitando access token...");
      tokenClient.requestAccessToken();
    });
  }

  /**
   * Move um arquivo no Drive pra outra pasta e/ou renomeia.
   * opts: { newParentId, newName }
   */
  window.atualizarArquivoNoDrive = async function (fileId, opts = {}) {
    if (!fileId) throw new Error("fileId obrigatório");
    const token = await getAccessToken();

    const params = new URLSearchParams();
    let removeParents = "";
    if (opts.newParentId) {
      // Busca parents atuais pra remover
      const getRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (getRes.ok) {
        const d = await getRes.json();
        removeParents = (d.parents || []).join(",");
      }
      params.set("addParents", opts.newParentId);
      if (removeParents) params.set("removeParents", removeParents);
    }
    params.set("fields", "id,name,parents,webViewLink");

    const body = {};
    if (opts.newName) body.name = opts.newName;

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error("Drive: atualizar arquivo falhou — " + t.slice(0, 200));
    }
    return res.json();
  };

  /**
   * Acha ou cria uma subpasta com o nome do prestador dentro do
   * folderId raiz. Retorna o id da subpasta, ou null se folderId raiz
   * não foi configurado (sem hierarquia possível).
   */
  window.findOrCreateFolderForPJ = async function (pjName) {
    if (!pjName || !pjName.trim()) {
      throw new Error("Nome do PJ é obrigatório pra organizar a pasta.");
    }
    if (!cfg.folderId) return null;
    const token = await getAccessToken();
    const parentId = cfg.folderId;
    const safeName = pjName.trim().replace(/'/g, "\\'");

    // 1) Procura subpasta existente
    const q = `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!searchRes.ok) {
      const t = await searchRes.text();
      throw new Error("Drive: busca de pasta falhou — " + t.slice(0, 200));
    }
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) return data.files[0].id;

    // 2) Cria nova
    const createRes = await fetch(
      "https://www.googleapis.com/drive/v3/files?fields=id,name",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: pjName.trim(),
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        }),
      }
    );
    if (!createRes.ok) {
      const t = await createRes.text();
      throw new Error("Drive: criar pasta falhou — " + t.slice(0, 200));
    }
    const folder = await createRes.json();
    if (typeof debug === "function") debug("[Drive] subpasta criada:", folder);
    return folder.id;
  };

  /**
   * Faz upload de um File pro Drive.
   * opts:
   *   - name: nome final do arquivo (padronização)
   *   - parents: lista de folder IDs (sobrescreve o folderId default)
   * Retorna { id, name, webViewLink }
   */
  window.uploadContratoToDrive = async function (file, opts = {}) {
    const token = await getAccessToken();
    const parents = opts.parents && opts.parents.length
      ? opts.parents
      : (cfg.folderId ? [cfg.folderId] : []);
    const metadata = {
      name: opts.name || file.name,
      ...(parents.length ? { parents } : {}),
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

  /**
   * Upload de um documento institucional pro Drive, numa subpasta dedicada
   * ("Documentos institucionais"). Reusa o OAuth e o uploader dos contratos PJ.
   * Retorna { id, name, webViewLink }.
   */
  window.uploadDocumentoToDrive = async function (file) {
    let parents = [];
    try {
      const fid = await window.findOrCreateFolderForPJ("Documentos institucionais");
      if (fid) parents = [fid];
    } catch (e) {
      if (typeof debug === "function") debug("[Drive] subpasta de documentos falhou, usando raiz:", e?.message || e);
    }
    const safe = String(file.name || "documento").replace(/[\\/:*?"<>|]+/g, "-");
    return window.uploadContratoToDrive(file, { name: safe, parents });
  };

  /**
   * Extrai texto de um PDF no Drive usando o OCR nativo do Google.
   * Estratégia: copia o PDF como Google Doc (Drive gatilha OCR) →
   * exporta como text/plain → deleta o Doc temporário.
   *
   * Funciona em PDFs escaneados (imagem). Precisão alta (Google Vision
   * por trás). Latência ~3-15s. Free dentro da cota do Drive.
   *
   * fileId: ID do arquivo PDF no Drive (já uploadado)
   * Retorna string com o texto extraído.
   */
  window.extrairTextoViaDriveOCR = async function (fileId) {
    if (!fileId) throw new Error("fileId obrigatório");
    const token = await getAccessToken();

    // 1) Copia como Google Doc — isso gatilha o OCR automaticamente
    const copyRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/copy?fields=id,name`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `[OCR temp ${Date.now()}]`,
          mimeType: "application/vnd.google-apps.document",
        }),
      }
    );
    if (!copyRes.ok) {
      const t = await copyRes.text();
      throw new Error("Drive copy (OCR) falhou: " + t.slice(0, 300));
    }
    const doc = await copyRes.json();
    const docId = doc.id;

    try {
      // 2) Exporta o Doc convertido como texto plano
      const expRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/plain`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!expRes.ok) {
        const t = await expRes.text();
        throw new Error("Drive export falhou: " + t.slice(0, 300));
      }
      const texto = await expRes.text();
      return texto;
    } finally {
      // 3) Limpa o Doc temporário, sucesso ou erro
      fetch(`https://www.googleapis.com/drive/v3/files/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch((e) => console.warn("[Drive OCR] cleanup falhou:", e));
    }
  };
})();
