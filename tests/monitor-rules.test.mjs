// Rules de monitor/wkradar: leitura admin/RH; escrita só do servidor (Admin SDK).
//   firebase emulators:exec --only firestore "node --test tests/monitor-rules.test.mjs"

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-monitor-rules",
    firestore: { rules: readFileSync("docs/firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/uRh"), { role: "rh", nome: "Suyanne" });
    await setDoc(doc(db, "users/uAdmin"), { role: "admin", nome: "Will" });
    await setDoc(doc(db, "users/uLider"), { role: "lider", turno: 1, nome: "Lider" });
    await setDoc(doc(db, "users/uColab"), { role: "colaborador", funcionarioId: "f-100", nome: "Maria" });
    await setDoc(doc(db, "monitor/wkradar"), {
      schema: "monitor-v1", agenda: "08:00 · 10:00 · 14:00 · seg–sex",
      resumo: { ok: 7, atencao: 1, parado: 0, total: 8 },
      ultimaExecucao: { status: "ok", duracaoSeg: 42, passos: 6 },
      fontes: [{ id: "wk-bh", label: "Banco de Horas", tipo: "wk-export", status: "ok", idadeMin: 2, meta: "ExpAuto_BancoHoras.txt" }],
    });
  });
});

after(async () => { await env.cleanup(); });

const rh = () => env.authenticatedContext("uRh").firestore();
const admin = () => env.authenticatedContext("uAdmin").firestore();
const lider = () => env.authenticatedContext("uLider").firestore();
const colab = () => env.authenticatedContext("uColab").firestore();

test("RH lê monitor/wkradar", async () => assertSucceeds(getDoc(doc(rh(), "monitor/wkradar"))));
test("Admin lê monitor/wkradar", async () => assertSucceeds(getDoc(doc(admin(), "monitor/wkradar"))));
test("Colaborador NÃO lê monitor/wkradar", async () => assertFails(getDoc(doc(colab(), "monitor/wkradar"))));
test("Líder NÃO lê monitor/wkradar (sem cap)", async () => assertFails(getDoc(doc(lider(), "monitor/wkradar"))));
test("RH NÃO escreve monitor/wkradar (só servidor)", async () =>
  assertFails(setDoc(doc(rh(), "monitor/wkradar"), { resumo: { ok: 0 } })));
test("Admin NÃO escreve monitor/wkradar (só servidor)", async () =>
  assertFails(setDoc(doc(admin(), "monitor/wkradar"), { resumo: { ok: 0 } })));
