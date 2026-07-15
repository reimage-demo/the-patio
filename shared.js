(function () {
const page = document.body.dataset.page
const toggle = document.querySelector('[data-menu-toggle]')
const nav = document.querySelector('[data-nav]')

function setMenu(open) {
  if (!toggle || !nav) return
  nav.classList.toggle('open', open)
  document.body.classList.toggle('nav-open', open)
  toggle.setAttribute('aria-expanded', String(open))
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation')
}

toggle?.addEventListener('click', () => setMenu(!nav.classList.contains('open')))
nav?.querySelectorAll('a, button').forEach(control => control.addEventListener('click', () => setMenu(false)))
document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false) })
window.addEventListener('resize', () => { if (window.innerWidth > 980) setMenu(false) })

document.querySelectorAll('[data-nav] a').forEach(link => {
  if (link.dataset.page === page) link.classList.add('active')
})

const reveal = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return
    entry.target.classList.add('revealed')
    reveal.unobserve(entry.target)
  })
}, { threshold: 0.12 })
document.querySelectorAll('[data-reveal]').forEach(element => reveal.observe(element))

const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

function money(cents) {
  return moneyFormatter.format(cents / 100)
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])
}

function displayDate(value) {
  if (!value) return ''
  return dateFormatter.format(new Date(`${value}T12:00:00Z`))
}

window.PatioUtils = { money, escapeHtml, displayDate }
})()
