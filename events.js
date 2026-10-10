const { fallbackEvents } = window.PatioData
const { displayDate, escapeHtml } = window.PatioUtils

const grid = document.querySelector('#eventsGrid')
const convexClient = window.PATIO_CONFIG?.convexUrl && window.PatioConvex
  ? new window.PatioConvex.ConvexClient(window.PATIO_CONFIG.convexUrl)
  : null
let eventsSignature = ''
let unsubscribeEvents

function render(events) {
  if (!events.length) {
    grid.innerHTML = '<div class="empty-state">Nothing is posted yet. Check back soon for the next Patio night.</div>'
    return
  }
  grid.innerHTML = events.map(event => `
    <article class="event-card" id="${escapeHtml(event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}" data-reveal>
      <a class="event-flyer" href="${escapeHtml(event.imageUrl || 'assets/images/patio-lounge.jpg')}" target="_blank" rel="noopener" aria-label="View full flyer for ${escapeHtml(event.title)} (opens in a new tab)"><img src="${escapeHtml(event.imageUrl || 'assets/images/patio-lounge.jpg')}" width="800" height="800" loading="lazy" decoding="async" alt="${escapeHtml(event.title)} event flyer"><span>View full flyer ↗</span></a>
      <div class="event-card-copy">
        <p class="event-date">${displayDate(event.date)}</p>
        <h3>${escapeHtml(event.title)}</h3>
        <p class="event-time">${escapeHtml(event.startTime)}${event.endTime ? ` – ${escapeHtml(event.endTime)}` : ''}</p>
        <p class="event-description">${escapeHtml(event.description)}</p>
      </div>
    </article>`).join('')
  grid.querySelectorAll('[data-reveal]').forEach(element => element.classList.add('revealed'))
}

function startLiveEvents() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  render(fallbackEvents.filter(event => event.date >= today))
  if (!convexClient) {
    console.warn('Using local event previews because the live data client is unavailable.')
    return
  }
  unsubscribeEvents = convexClient.onUpdate('events:listPublished', {}, events => {
    const nextSignature = JSON.stringify(events.map(event => [event._id, event.updatedAt, event.imageStorageId]))
    if (nextSignature === eventsSignature) return
    eventsSignature = nextSignature
    render(events)
  }, error => console.warn('Using local event previews until Convex is connected.', error))
}

startLiveEvents()
window.addEventListener('beforeunload', () => {
  unsubscribeEvents?.()
  convexClient?.close()
})
