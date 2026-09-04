#!/usr/bin/env node
// Post-publish verification: install the plugin via BOTH supported sources
// (npm registry + GitHub) into throwaway dirs, then smoke-test the installed
// bundle. Usage:
//   node scripts/verify-install.mjs           # deterministic, offline
//   node scripts/verify-install.mjs --live    # also hit the real dsh.so index
// Exit code is 0 when both sources install and pass the functional smoke test.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const NAME = PKG.name
const VERSION = PKG.version
const LIVE = process.argv.includes('--live')

const SAMPLE_INDEX = [
  { name: 'dsh-vision-router', stars: 120, topics: ['vision', 'image'], description: 'route image understanding to an OCR tool', install: 'dsh plugin add dsh-vision-router', url: 'https://dsh.so/p/dsh-vision-router' },
  { name: 'dsh-traffic-light', stars: 90, topics: ['terminal', 'tui'], description: 'terminal traffic-light UI', install: 'dsh plugin add dsh-traffic-light', url: 'https://dsh.so/p/dsh-traffic-light' },
  { name: 'pi2dsh', stars: 200, topics: [], description: 'agent dev kit for dsh', install: 'dsh plugin add pi2dsh', url: 'https://dsh.so/p/pi2dsh' },
]

function quote(a) {
  return /^[A-Za-z0-9_@/.:^=~-]+$/.test(a) ? a : `"${a}"`
}

function run(cmd, args, cwd) {
  const cmdline = `${cmd} ${args.map(quote).join(' ')}`
  const r = spawnSync(cmdline, {
    cwd,
    shell: true,
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, npm_config_fetch_retries: '6' },
  })
  if (r.error) throw r.error
  return { status: r.status, out: r.stdout + r.stderr }
}

function makeWorkdir() {
  const dir = mkdtempSync(join(tmpdir(), `dshpf-${Date.now().toString(36)}-`))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'verify-root', private: true }, null, 2))
  // Mirror the settings dsh writes into a profile's pnpm-workspace.yaml.
  writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n')
  return dir
}

async function smoke(installedDir) {
  const pj = JSON.parse(readFileSync(join(installedDir, 'package.json'), 'utf8'))
  const libDir = join(installedDir, 'lib')
  if (pj.name !== NAME) throw new Error(`installed name "${pj.name}" != "${NAME}"`)
  for (const f of ['index.js', 'match.js']) {
    if (!existsSync(join(libDir, f))) throw new Error(`missing lib/${f}`)
  }
  const { findMatches } = await import(pathToFileURL(join(libDir, 'match.js')).href)
  const top = findMatches(SAMPLE_INDEX, 'terminal', 3)
  if (!top || !top[0] || top[0].name !== 'dsh-traffic-light') {
    throw new Error(`functional smoke failed; top=${JSON.stringify(top?.[0])}`)
  }
  return `name=${pj.name}@${pj.version} findMatches()->${top[0].name}`
}

async function verify(method, spec) {
  const dir = makeWorkdir()
  const label = `method ${method} (${spec})`
  try {
    const inst = run('pnpm', ['add', spec], dir)
    if (inst.status !== 0) {
      throw new Error(`pnpm add exited ${inst.status}:\n${inst.out}`)
    }
    const installed = NAME.startsWith('@')
      ? join(dir, 'node_modules', ...NAME.split('/'))
      : join(dir, 'node_modules', NAME)
    if (!existsSync(installed)) throw new Error(`not installed at ${installed}`)
    const detail = await smoke(installed)

    if (LIVE) {
      const res = await fetch('https://www.dsh.so/plugins-index.json')
      if (!res.ok) throw new Error('live index HTTP ' + res.status)
      const { plugins = [] } = await res.json()
      const { findMatches: fm } = await import(pathToFileURL(join(installed, 'lib', 'match.js')).href)
      const m = fm(plugins, 'terminal', 3)
      if (!m.length) throw new Error('live index: no match for "terminal"')
      console.log(`    live index: ${plugins.length} plugins, top ${m[0].name}`)
    }

    console.log(`\x1b[32mPASS\x1b[0m ${label} - ${detail}`)
    return true
  } catch (e) {
    console.log(`\x1b[31mFAIL\x1b[0m ${label} - ${e.message}`)
    return false
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

console.log(`Verifying ${NAME}@${VERSION} (--live=${LIVE})`)
let ok = (await verify('npm', `${NAME}@${VERSION}`)) === true
ok = (await verify('git', `github:dsh-so/dsh-plugin-advisor`)) && ok
if (!ok) {
  console.error(`\x1b[31m\nVERIFICATION FAILED\x1b[0m`)
  process.exit(1)
}
console.log(`\x1b[32m\nVERIFICATION PASSED - both install sources work\x1b[0m`)