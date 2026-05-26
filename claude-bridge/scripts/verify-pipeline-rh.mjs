// claude-bridge/scripts/verify-pipeline-rh.mjs
//
// Lê pipeline-rh/cur e pipeline-rh/hist do Firestore do projeto ocorr-ponto
// e dumpa resumo + sample anonimizado. Use pra confirmar que o pipeline RH
// tá vivo + atualizado, sem expor dados de funcionários reais.
//
// Pré-requisitos:
//   npm install firebase-admin
//   ajusta SA_PATH abaixo pro path do service-account.json no SEU lado
//
// Service account: precisa de role Firebase Admin (ou Datastore Reader) no
// projeto ocorr-ponto.

import { readFileSync, existsSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// AJUSTAR conforme onde colou o service-account.json
const SA_PATH = process.env.SA_PATH || 'C:/Claude/service-account-ocorr-ponto.json'

if (!existsSync(SA_PATH)) {
  console.error(`Service account não encontrado em ${SA_PATH}`)
  console.error(`Ajusta a constante SA_PATH no script ou seta env SA_PATH.`)
  process.exit(1)
}

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'))
initializeApp({ credential: cert(sa), projectId: 'ocorr-ponto' })
const db = getFirestore()

console.log('=== pipeline-rh/cur ===')
const curDoc = await db.collection('pipeline-rh').doc('cur').get()
if (!curDoc.exists) {
  console.error('Doc /pipeline-rh/cur não existe. Pipeline RH não rodou ou falhou.')
  process.exit(1)
}
const cur = curDoc.data()
const gen = cur.meta.generatedAt?._seconds
  ? new Date(cur.meta.generatedAt._seconds * 1000).toISOString()
  : '?'

console.log('Schema:        ' + cur.schema)
console.log('Pipeline ver:  ' + cur.meta.pipelineVersion)
console.log('Gerado em:     ' + gen)
console.log('Source CSV:    ' + cur.meta.sourceCSV)
console.log('Mês corrente:  ' + cur.month)
console.log('Período:       ' + cur.meta.periodStart + ' → ' + cur.meta.periodEnd)
console.log('Funcionários ativos:    ' + cur.meta.totalFuncionariosAtivos)
console.log('Funcionários inativos:  ' + cur.meta.totalFuncionariosInativos)
console.log('Total lançamentos:      ' + cur.meta.totalLancamentos)
console.log('Warnings do parser:     ' + cur.meta.warnings)
console.log()

// Sample anonimizado
const sample = cur.funcionarios[0]
console.log('Sample funcionário (anonimizado):')
console.log('  funcId mask:   ' + sample.funcId.slice(0, 1) + '***')
console.log('  cargo:         ' + sample.cargo)
console.log('  departamento:  ' + sample.departamento)
console.log('  turno:         ' + sample.turno)
console.log('  ativo:         ' + sample.ativo)
console.log('  saldoAtualMin: ' + sample.saldoAtualMin + ' (' + sample.saldoAtualFmt + ')')
console.log('  ultimaData:    ' + sample.ultimaDataIso)
console.log('  lançamentos:   ' + sample.lancamentos.length + ' dias')

// Distribuição por departamento
const porDepto = {}
for (const f of cur.funcionarios) porDepto[f.departamento] = (porDepto[f.departamento] || 0) + 1
console.log('\nDistribuição por departamento (ativos):')
for (const [d, c] of Object.entries(porDepto).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + d.padEnd(30) + ' → ' + c)
}

// Histórico
console.log('\n=== pipeline-rh/hist ===')
const histDoc = await db.collection('pipeline-rh').doc('hist').get()
const hist = histDoc.data()
const histGen = hist.generatedAt?._seconds
  ? new Date(hist.generatedAt._seconds * 1000).toISOString()
  : '?'
console.log('Gerado em:  ' + histGen)
const histMonths = Object.keys(hist.months)
console.log('Meses fechados (' + histMonths.length + '): ' + (histMonths.length === 0 ? '(vazio — maio ainda é mês corrente)' : histMonths.join(', ')))

process.exit(0)
