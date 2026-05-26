// claude-bridge/scripts/inbox.mjs
//
// Lista mensagens na inbox do lado especificado. Sem args, infere pelo hostname.
//
// Uso:
//   node claude-bridge/scripts/inbox.mjs              # auto-detecta lado
//   node claude-bridge/scripts/inbox.mjs --side pc    # explícito
//   node claude-bridge/scripts/inbox.mjs --since 2026-05-26  # só novas

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hostname } from 'node:os'

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

let side = opts.side
if (!side) {
  const host = hostname().toLowerCase()
  if (host.includes('wkradar') || host.includes('wk-radar')) side = 'wkradar'
  else side = 'pc'
}

const inboxDir = join(BRIDGE_ROOT, `inbox-${side}`)
if (!existsSync(inboxDir)) {
  console.log(`Inbox vazia (${inboxDir} não existe).`)
  process.exit(0)
}

const files = readdirSync(inboxDir)
  .filter((f) => f.endsWith('.md'))
  .sort()

if (files.length === 0) {
  console.log(`Inbox-${side} está vazia.`)
  process.exit(0)
}

const sinceFilter = opts.since
let shown = 0
for (const f of files) {
  // Filtro de data pelo nome do arquivo (que começa com YYYY-MM-DD)
  if (sinceFilter && f.slice(0, 10) < sinceFilter) continue
  const fpath = join(inboxDir, f)
  const raw = readFileSync(fpath, 'utf8')
  console.log('═'.repeat(70))
  console.log(`📬 ${f}`)
  console.log('─'.repeat(70))
  console.log(raw)
  console.log()
  shown++
}
console.log('═'.repeat(70))
console.log(`Total: ${shown} mensagens em inbox-${side}${sinceFilter ? ' desde ' + sinceFilter : ''}`)
