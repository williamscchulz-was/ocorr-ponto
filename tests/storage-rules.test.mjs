// Rules do Firebase Storage (docs/storage.rules). As rules do Storage NAO leem o
// Firestore: o controle vem de CUSTOM CLAIMS no token (role, funcionarioId). Aqui
// os claims sao injetados via authenticatedContext(uid, claims).
//
// Cobre o bloco NOVO documentos-assinados/{funcionarioId} (comprovante da assinatura
// eletronica de documento) E o de recibos/{funcionarioId}/{original,assinado} que
// tinha ido pra producao sem teste.
//
//   firebase emulators:exec --only firestore,storage "node --test tests/storage-rules.test.mjs"
//
//   (precisa: npm install --no-save @firebase/rules-unit-testing firebase)

import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { ref, uploadBytes, getBytes } from "firebase/storage";

let env;

// claims: colaborador dono do f-1, outro colaborador f-2, admin (gestor).
const COLAB1 = { role: "colaborador", funcionarioId: "f-1" };
const COLAB2 = { role: "colaborador", funcionarioId: "f-2" };
const ADMIN = { role: "admin" };
const RH = { role: "rh" };

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // "%PDF-1.4"
const META_PDF = { contentType: "application/pdf" };
const META_PNG = { contentType: "image/png" };
const GRANDE = new Uint8Array(10 * 1024 * 1024 + 1024); // > 10 MB

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "fiopulse-storage-rules",
    storage: { rules: readFileSync("docs/storage.rules", "utf8") },
  });
  // Semeia arquivos (rules desligadas) pros testes de LEITURA e de create-only.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const st = ctx.storage();
    await uploadBytes(ref(st, "documentos-assinados/f-1/doc1-v1.pdf"), PDF, META_PDF);
    await uploadBytes(ref(st, "recibos/f-1/assinado/2026-06-recibo.pdf"), PDF, META_PDF);
    await uploadBytes(ref(st, "recibos/f-1/original/2026-06-recibo.pdf"), PDF, META_PDF);
  });
});
after(async () => { await env.cleanup(); });

const st = (uid, claims) => env.authenticatedContext(uid, claims).storage();
const anon = () => env.unauthenticatedContext().storage();

// ================= documentos-assinados/{funcionarioId} (bloco novo) =================

test("Dono grava o proprio comprovante PDF (create)", async () =>
  assertSucceeds(uploadBytes(ref(st("u1", COLAB1), "documentos-assinados/f-1/doc9-v1.pdf"), PDF, META_PDF)));

test("Terceiro NAO grava no funcionarioId de outro", async () =>
  assertFails(uploadBytes(ref(st("u2", COLAB2), "documentos-assinados/f-1/doc9-v1.pdf"), PDF, META_PDF)));

test("Anonimo NAO grava comprovante", async () =>
  assertFails(uploadBytes(ref(anon(), "documentos-assinados/f-1/doc9-v1.pdf"), PDF, META_PDF)));

test("Dono NAO sobrescreve comprovante ja existente (create-only)", async () =>
  assertFails(uploadBytes(ref(st("u1", COLAB1), "documentos-assinados/f-1/doc1-v1.pdf"), PDF, META_PDF)));

test("NAO grava comprovante que nao e PDF", async () =>
  assertFails(uploadBytes(ref(st("u1", COLAB1), "documentos-assinados/f-1/doc-img.pdf"), PDF, META_PNG)));

test("NAO grava comprovante acima de 10 MB", async () =>
  assertFails(uploadBytes(ref(st("u1", COLAB1), "documentos-assinados/f-1/doc-grande.pdf"), GRANDE, META_PDF)));

test("Dono le o proprio comprovante", async () =>
  assertSucceeds(getBytes(ref(st("u1", COLAB1), "documentos-assinados/f-1/doc1-v1.pdf"))));

test("Gestor (admin) le comprovante de qualquer um", async () =>
  assertSucceeds(getBytes(ref(st("uA", ADMIN), "documentos-assinados/f-1/doc1-v1.pdf"))));

test("Terceiro NAO le comprovante de outro", async () =>
  assertFails(getBytes(ref(st("u2", COLAB2), "documentos-assinados/f-1/doc1-v1.pdf"))));

// ================= recibos/{funcionarioId}/assinado (estava sem teste) =================

test("Recibo assinado: dono grava o proprio (create)", async () =>
  assertSucceeds(uploadBytes(ref(st("u1", COLAB1), "recibos/f-1/assinado/2026-07-recibo.pdf"), PDF, META_PDF)));

test("Recibo assinado: terceiro NAO grava", async () =>
  assertFails(uploadBytes(ref(st("u2", COLAB2), "recibos/f-1/assinado/2026-07-recibo.pdf"), PDF, META_PDF)));

test("Recibo assinado: dono NAO sobrescreve (create-only)", async () =>
  assertFails(uploadBytes(ref(st("u1", COLAB1), "recibos/f-1/assinado/2026-06-recibo.pdf"), PDF, META_PDF)));

test("Recibo assinado: dono le o proprio", async () =>
  assertSucceeds(getBytes(ref(st("u1", COLAB1), "recibos/f-1/assinado/2026-06-recibo.pdf"))));

test("Recibo assinado: gestor (RH) le", async () =>
  assertSucceeds(getBytes(ref(st("uR", RH), "recibos/f-1/assinado/2026-06-recibo.pdf"))));

// ================= recibos/{funcionarioId}/original (gestor grava) =================

test("Recibo original: gestor grava PDF", async () =>
  assertSucceeds(uploadBytes(ref(st("uA", ADMIN), "recibos/f-1/original/2026-08-recibo.pdf"), PDF, META_PDF)));

test("Recibo original: colaborador NAO grava (so gestor)", async () =>
  assertFails(uploadBytes(ref(st("u1", COLAB1), "recibos/f-1/original/2026-09-recibo.pdf"), PDF, META_PDF)));

test("Recibo original: dono le o proprio", async () =>
  assertSucceeds(getBytes(ref(st("u1", COLAB1), "recibos/f-1/original/2026-06-recibo.pdf"))));

test("Recibo original: terceiro NAO le", async () =>
  assertFails(getBytes(ref(st("u2", COLAB2), "recibos/f-1/original/2026-06-recibo.pdf"))));

// ================= caminho fora das rules: negado =================

test("Caminho arbitrario e negado (grava)", async () =>
  assertFails(uploadBytes(ref(st("u1", COLAB1), "qualquer/coisa.pdf"), PDF, META_PDF)));
