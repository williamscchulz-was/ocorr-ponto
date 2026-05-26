// claude-bridge/scripts/send.mjs
//
// Helper pra enviar uma mensagem pro outro lado. Escreve um arquivo .md
// com frontmatter na inbox-<destino>/. NÃO faz git commit/push — Claude
// chamador faz isso depois (`git add . && git commit && git push`).
//
// Uso:
//   node claude-bridge/scripts/send.mjs --to pc --topic "pipeline ok" \
//     --body "Tudo rodando aqui, pipeline-rh/cur atualizado às 08:00 hoje."
//
// Em vez de --body, pode passar conteúdo via stdin:
//   node claude-bridge/scripts/send.mjs --to wkradar --topic "duvida" < msg.md

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BRIDGE_ROOT = join(__dirname, '..')

const args = process.argv.slice(2)
const opts = {}
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    opts[args[i].slice(2)] = args[i + 1]
    i++
  }
}

const to = opts.to
const from = opts.from || (to === 'pc' ? 'wkradar' : to === 'wkradar' ? 'pc' : null)
const topic = opts.topic || 'sem-topico'

if (!to || (to !== 'pc' && to !== 'wkradar')) {
  console.error('Uso: node send.mjs --to <pc|wkradar> --topic "..." --body "..."')
  console.error('     ou passa conteúdo via stdin: ... < msg.md')
  process.exit(1)
}
if (!from) {
  console.error('Não consegui inferir --from. Passa --from explícito.')
  process.exit(1)
}

// Lê body: --body OU stdin
let body = opts.body
if (!body) {
  // Lê stdin sync (Node v16+)
  try {
    body = readFileSync(0, 'utf8').trim()
  } catch {
    body = ''
  }
}
if (!body) {
  console.error('Conteúdo vazio. Use --body "..." ou pipe via stdin.')
  process.exit(1)
}

const now = new Date()
const ts = now.toISOString()
const fname = `${ts.slice(0, 10)}-${ts.slice(11, 13)}${ts.slice(14, 16)}-${slugify(topic)}.md`
const inboxDir = join(BRIDGE_ROOT, `inbox-${to}`)
if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true })
const fpath = join(inboxDir, fname)

const content = `---
from: ${from}
to: ${to}
ts: ${ts}
topic: ${topic}
---

${body}
`

writeFileSync(fpath, content, 'utf8')
console.log(`✓ Mensagem escrita em ${fpath}`)
console.log(`Lembra de: git add claude-bridge/ && git commit -m "bridge: ${topic}" && git push`)

function slugify(s) {
  return s.toLowerCase()
    .replace(/[áàâãä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function readFileSync(fd, enc) {
  const { readFileSync: fs_read } = require('node:fs')
  return fs_read(fd, enc)
}
