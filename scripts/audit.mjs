// CI audit gate: fail on high or critical advisories, minus a short,
// documented allowlist. `npm audit` has no way to ignore an advisory, so one
// without a patched release would otherwise block every pull request.
import { execFileSync } from 'node:child_process'

// Every entry needs a reason. Revisit when the advisory gets a fix; the
// script warns once an entry is no longer reported so it can be removed.
const ALLOWLIST = {
  // node-forge RSA PKCS#1 v1.5 signature verification. No patched release
  // exists. Only reached through listhen (Nuxt's dev server), which uses
  // node-forge to generate self-signed dev certificates and never verifies
  // signatures. Not part of the production build.
  'GHSA-86w9-cpqp-85rv': 'node-forge via listhen, dev server only, no fix released',
}

const BLOCKING_SEVERITIES = new Set(['high', 'critical'])

let raw
try {
  raw = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
} catch (error) {
  // npm audit exits non-zero whenever it finds anything; the report is still on stdout
  raw = error.stdout
}

let report
try {
  report = JSON.parse(raw)
} catch {
  console.error('npm audit did not return a JSON report')
  process.exit(1)
}
if (report.error) {
  console.error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`)
  process.exit(1)
}

// Advisories appear as objects in `via` on the package that is actually
// vulnerable; dependents only list package names, so they follow from these
const advisories = new Map()
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via) {
    if (typeof via === 'object') advisories.set(via.url, via)
  }
}

const blocking = []
const seenAllowed = new Set()
for (const advisory of advisories.values()) {
  const id = advisory.url.split('/').pop()
  if (id in ALLOWLIST) {
    seenAllowed.add(id)
    console.log(`allowed  ${id}  ${advisory.name}: ${ALLOWLIST[id]}`)
  } else if (BLOCKING_SEVERITIES.has(advisory.severity)) {
    blocking.push(advisory)
  }
}

for (const id of Object.keys(ALLOWLIST)) {
  if (!seenAllowed.has(id)) {
    console.warn(`warning  ${id} is no longer reported; remove it from the allowlist in scripts/audit.mjs`)
  }
}

if (blocking.length > 0) {
  for (const advisory of blocking) {
    console.error(`${advisory.severity.padEnd(8)} ${advisory.name} ${advisory.range}: ${advisory.title} (${advisory.url})`)
  }
  console.error(`\n${blocking.length} high or critical advisor${blocking.length === 1 ? 'y' : 'ies'}. Run \`npm audit\` for details.`)
  process.exit(1)
}

console.log('No unallowed high or critical advisories.')
