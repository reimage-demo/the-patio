import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`
const checks = [
  ['Hero 960', 'assets/images/patio-front-upright-960.webp', 180 * 1024, false],
  ['Hero 1600', 'assets/images/patio-front-upright-1600.webp', 450 * 1024, false],
  ['Hero 2400', 'assets/images/patio-front-upright-2400.webp', 750 * 1024, false],
  ['Founder portrait', 'assets/images/kayan-founder.webp', 250 * 1024, false],
  ['Shared logo', 'assets/logo-400.webp', 80 * 1024, false],
  ['Public Convex client', 'vendor/convex-client.js', 30 * 1024, true]
]

const adminBundle = readdirSync('admin-portal/dist/assets').find(file => /^admin-.*\.js$/.test(file))
if (adminBundle) checks.push(['Admin JavaScript', `admin-portal/dist/assets/${adminBundle}`, 90 * 1024, true])

let failed = false
for (const [label, file, budget, compressed] of checks) {
  const bytes = compressed ? gzipSync(readFileSync(file)).length : statSync(file).size
  const passes = bytes <= budget
  failed ||= !passes
  console.log(`${passes ? 'PASS' : 'FAIL'} ${label}: ${kb(bytes)} / ${kb(budget)}${compressed ? ' gzip' : ''}`)
}

if (failed) process.exitCode = 1
