const { fallbackEvents } = window.PatioData
const { displayDate, escapeHtml } = window.PatioUtils

const grid = document.querySelector('#eventsGrid')
let convexClientPromise
function getConvexClient() {
  if (!convexClientPromise) {
    convexClientPromise = import('https://esm.sh/convex@1.31.5/browser').then(({ ConvexHttpClient }) => new ConvexHttpClient(window.PATIO_CONFIG.convexUrl))
  }
  return convexClientPromise
}

function render(events) {
  if (!events.length) {
    grid.innerHTML = '<div class="empty-state">Nothing is posted yet. Check back soon for the next Patio night.</div>'
    return
  }
  grid.innerHTML = events.map(event => `
    <article class="event-card" data-reveal>
      <img src="${escapeHtml(event.imageUrl || 'assets/images/patio-lounge.jpg')}" alt="${escapeHtml(event.title)} event artwork">
      <div class="event-card-copy">
        <p class="event-date">${displayDate(event.date)}</p>
        <h3>${escapeHtml(event.title)}</h3>
        <p class="event-time">${escapeHtml(event.startTime)}${event.endTime ? ` – ${escapeHtml(event.endTime)}` : ''}</p>
        <p class="event-description">${escapeHtml(event.description)}</p>
      </div>
    </article>`).join('')
  grid.querySelectorAll('[data-reveal]').forEach(element => element.classList.add('revealed'))
}

async function loadEvents() {
  render(fallbackEvents)
  if (!window.PATIO_CONFIG?.convexUrl) return render(fallbackEvents)
  try {
    const client = await getConvexClient()
    const events = await client.query('events:listPublished', {})
    render(events.length ? events : fallbackEvents)
  } catch (error) {
    console.warn('Using local event previews until Convex is connected.', error)
    render(fallbackEvents)
  }
}

loadEvents()
