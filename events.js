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
    <article class="event-card" data-reveal>
      <img src="${escapeHtml(event.imageUrl || 'assets/images/patio-lounge.jpg')}" width="800" height="640" loading="lazy" decoding="async" alt="${escapeHtml(event.title)} event artwork">
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
  render(fallbackEvents)
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
