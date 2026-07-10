const { fallbackMenu } = window.PatioData
const { escapeHtml, money } = window.PatioUtils

const menuGrid = document.querySelector('#menuGrid')
const orderBoard = document.querySelector('#orderBoard')
const drawer = document.querySelector('#cartDrawer')
const dialog = document.querySelector('#checkoutDialog')
const cart = new Map()
let convexClientPromise
function getConvexClient() {
  if (!convexClientPromise) {
    convexClientPromise = import('https://esm.sh/convex@1.31.5/browser').then(({ ConvexHttpClient }) => new ConvexHttpClient(window.PATIO_CONFIG.convexUrl))
  }
  return convexClientPromise
}
let menu = []
let pollTimer

function renderMenu() {
  menuGrid.innerHTML = menu.filter(item => item.isAvailable).map(item => `
    <article class="menu-card">
      <div class="menu-card-top"><h3>${escapeHtml(item.name)}</h3><span class="menu-card-price">${money(item.price)}</span></div>
      <p>${escapeHtml(item.description)}</p>
      <span class="menu-tag">${escapeHtml(item.accent || item.category)}</span>
      <button class="add-button" data-add="${item._id}" aria-label="Order ${escapeHtml(item.name)} now">Order now <span>+</span></button>
    </article>`).join('')
  menuGrid.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => changeQuantity(button.dataset.add, 1)))
}

function cartLines() {
  return [...cart.entries()].map(([id, quantity]) => ({ item: menu.find(row => String(row._id) === String(id)), quantity })).filter(row => row.item)
}

function changeQuantity(id, delta) {
  const next = (cart.get(id) || 0) + delta
  next > 0 ? cart.set(id, next) : cart.delete(id)
  renderCart()
  if (delta > 0 && !document.body.classList.contains('cart-open')) showAdded(id)
}

let toastTimer
function showAdded(id) {
  const item = menu.find(row => String(row._id) === String(id))
  const toast = document.querySelector('#cartToast')
  toast.textContent = `${item?.name || 'Drink'} added to your cart`
  toast.classList.add('show')
  document.querySelector('#cartButton').classList.remove('cart-bump')
  requestAnimationFrame(() => document.querySelector('#cartButton').classList.add('cart-bump'))
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1800)
}

function renderCart() {
  const lines = cartLines()
  document.querySelector('#cartCount').textContent = lines.reduce((sum, line) => sum + line.quantity, 0)
  const total = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)
  document.querySelector('#cartTotal').textContent = money(total)
  document.querySelector('#cartPreviewTotal').textContent = money(total)
  document.querySelector('#cartItems').innerHTML = lines.length ? lines.map(({ item, quantity }) => `
    <div class="cart-item"><div><h3>${escapeHtml(item.name)}</h3><p>${money(item.price)} each</p></div><div class="quantity"><button data-minus="${item._id}" aria-label="Remove one">−</button><span>${quantity}</span><button data-plus="${item._id}" aria-label="Add one">+</button></div></div>`).join('') : '<div class="cart-empty">Your cart is ready for something good.</div>'
  document.querySelectorAll('[data-minus]').forEach(button => button.onclick = () => changeQuantity(button.dataset.minus, -1))
  document.querySelectorAll('[data-plus]').forEach(button => button.onclick = () => changeQuantity(button.dataset.plus, 1))
}

function openCart() { document.body.classList.add('cart-open'); drawer.setAttribute('aria-hidden', 'false') }
function closeCart() { document.body.classList.remove('cart-open'); drawer.setAttribute('aria-hidden', 'true') }
document.querySelector('#cartButton').onclick = openCart
document.querySelector('#closeCart').onclick = closeCart
document.querySelector('#scrim').onclick = closeCart
document.querySelector('#checkoutButton').onclick = () => {
  if (!cart.size) return
  closeCart(); dialog.showModal()
}
document.querySelector('#closeCheckout').onclick = () => dialog.close()

const sampleOrders = [
  { displayName: 'Maya', status: 'in-progress', itemSummary: '2× Pretty in Pink' },
  { displayName: 'Jordan', status: 'in-progress', itemSummary: '1× Main Street Mule, 1× The Birdie' },
  { displayName: 'Alexis', status: 'ready', itemSummary: '2× Passion Fruit Margarita' }
]

function renderOrders(orders) {
  const visibleOrders = orders.length ? orders : sampleOrders
  orderBoard.innerHTML = visibleOrders.map(order => `
    <article class="order-ticket status-${order.status}">
      <div class="order-ticket-main"><span class="order-icon" aria-hidden="true"></span><div><small>Order for</small><h3>${escapeHtml(order.displayName || order.customerName.split(' ')[0])}</h3></div></div>
      <p class="order-items">${escapeHtml(order.itemSummary)}</p>
      <div class="order-progress"><span><i></i></span><strong>${order.status === 'ready' ? 'Ready for pickup' : escapeHtml(order.status.replace('-', ' '))}</strong></div>
    </article>`).join('')
}

async function loadOrders() {
  if (!window.PATIO_CONFIG?.convexUrl) return renderOrders([])
  try { const client = await getConvexClient(); renderOrders(await client.query('orders:activeBoard', {})) } catch (error) { console.warn('Order board unavailable.', error); renderOrders([]) }
}

async function loadMenu() {
  menu = fallbackMenu
  renderMenu()
  renderCart()
  renderOrders([])
  if (window.PATIO_CONFIG?.convexUrl) {
    try {
      const client = await getConvexClient()
      const liveMenu = await client.query('menuItems:listAvailable', {})
      if (liveMenu.length) { menu = liveMenu; renderMenu(); renderCart() }
    } catch (error) { console.warn('Using the local menu preview.', error) }
  }
  await loadOrders()
  if (window.PATIO_CONFIG?.convexUrl) pollTimer = window.setInterval(loadOrders, 7000)
}

document.querySelector('#checkoutForm').addEventListener('submit', async event => {
  event.preventDefault()
  const message = document.querySelector('#checkoutMessage')
  const button = event.submitter
  if (!window.PATIO_CONFIG?.convexUrl) {
    message.className = 'form-message error'; message.textContent = 'Ordering opens when this site is connected to The Patio’s Convex deployment.'; return
  }
  button.disabled = true; button.textContent = 'Placing order…'; message.textContent = ''
  const form = new FormData(event.currentTarget)
  const lines = cartLines()
  try {
    const client = await getConvexClient()
    const result = await client.mutation('orders:create', {
      customerName: form.get('customerName').trim(), phone: form.get('phone').trim(), email: form.get('email').trim(), notes: form.get('notes').trim(), ageConfirmed: true,
      items: lines.map(({ item, quantity }) => ({ menuItemId: item._id, name: item.name, unitPrice: item.price, quantity, selectedAddOns: [] }))
    })
    message.className = 'form-message success'; message.textContent = `Order ${result.orderNumber} received! Watch the live board for your first name.`
    cart.clear(); renderCart(); event.currentTarget.reset(); await loadOrders()
    window.setTimeout(() => dialog.close(), 3200)
  } catch (error) {
    message.className = 'form-message error'; message.textContent = error?.data?.message || 'We could not place that order. Please try again.'
  } finally { button.disabled = false; button.innerHTML = 'Place order <span>→</span>' }
})

window.addEventListener('beforeunload', () => window.clearInterval(pollTimer))
loadMenu()
