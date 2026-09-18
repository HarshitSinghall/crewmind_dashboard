import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [actions, roi, detail, nav, layout, css, login] = await Promise.all([
  read('src/components/LeadActions.tsx'),
  read('src/components/RoiInputs.tsx'),
  read('src/app/(app)/leads/[id]/page.tsx'),
  read('src/components/Nav.tsx'),
  read('src/app/(app)/layout.tsx'),
  read('src/app/globals.css'),
  read('src/app/login/page.tsx'),
])

assert.match(actions, /catch \{[\s\S]*network request failed/i, 'lead actions must handle network rejection')
assert.match(actions, /if \(active \|\| touched\) return/, 'lead touch must reject rapid duplicate actions')
assert.match(roi, /finally \{[\s\S]*setSaving\(false\)/, 'ROI save must always leave pending state')
assert.match(detail, /c\.id === query\.call/, 'lead detail must honor an explicitly selected call')
assert.match(detail, /appointment\.requested/, 'timeline must include requested appointments')
assert.match(nav, /variant.*mobile/, 'navigation must provide a mobile variant')
assert.match(layout, /className="side-rail/, 'desktop CRM shell must render its sidebar')
assert.match(css, /min-height: 44px/, 'shared controls must meet the web touch-target baseline')
const retiredDemoPassword = ['Crewmind', 'Test!', '2026'].join('')
assert.doesNotMatch(login, new RegExp(retiredDemoPassword), 'demo passwords must not be embedded in the login UI')
assert.doesNotMatch(login, /DEMO_ACCOUNTS/, 'demo account identifiers must not be embedded in the login UI')

console.log('UI contract checks passed (10 assertions).')
