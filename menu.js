const { fallbackMenu } = window.PatioData
const { escapeHtml, money } = window.PatioUtils

const menuGrid = document.querySelector('#menuGrid')
const categoryNav = document.querySelector('#categoryNav')
const drawer = document.querySelector('#cartDrawer')
const dialog = document.querySelector('#checkoutDialog')
const cartItemsElement = document.querySelector('#cartItems')
const cart = new Map()
const convexClient = window.PATIO_CONFIG?.convexUrl && window.PatioConvex
  ? new window.PatioConvex.ConvexClient(window.PATIO_CONFIG.convexUrl)
  : null
let menu = []
let menuSignature = ''
let checkoutRequestId = null
const subscriptions = []

function renderMenu() {
  const available = menu.filter(item => item.isAvailable)
  const categories = [...new Set(available.map(item => item.category || 'Menu'))]
  categoryNav.innerHTML = categories.map((category, index) => `<a href="#menu-category-${index}">${escapeHtml(category)}</a>`).join('')
  menuGrid.innerHTML = available.length ? categories.map((category, categoryIndex) => `
    <section class="menu-category" id="menu-category-${categoryIndex}">
      <div class="menu-category-heading"><div><p>Explore</p><h2>${escapeHtml(category)}</h2></div><span>${available.filter(item => (item.category || 'Menu') === category).length} items</span></div>
      <div class="menu-items-grid">${available.filter(item => (item.category || 'Menu') === category).map(item => `
        <article class="menu-card">
          <div class="menu-card-media">${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" width="800" height="600" loading="lazy" decoding="async" alt="${escapeHtml(item.name)}">` : `<div class="menu-photo-placeholder"><span>${escapeHtml(item.accent || category)}</span><strong>${escapeHtml(item.name.charAt(0))}</strong></div>`}</div>
          <div class="menu-card-body"><div class="menu-card-top"><h3>${escapeHtml(item.name)}</h3><span class="menu-card-price">${money(item.price)}</span></div><p>${escapeHtml(item.description)}</p><div class="menu-card-actions"><span class="menu-tag">${escapeHtml(item.accent || category)}</span><button class="add-button" data-add="${item._id}" aria-label="Add ${escapeHtml(item.name)} to cart"><span>Add</span><b>+</b></button></div></div>
        </article>`).join('')}</div>
    </section>`).join('') : '<div class="empty-state">The online menu is being updated. Please check back shortly.</div>'
}

menuGrid.addEventListener('click', event => {
  const button = event.target.closest('[data-add]')
  if (button) changeQuantity(button.dataset.add, 1)
})

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
  cartItemsElement.innerHTML = lines.length ? lines.map(({ item, quantity }) => `
    <div class="cart-item">${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" width="64" height="64" alt="">` : '<span class="cart-item-placeholder">P</span>'}<div><h3>${escapeHtml(item.name)}</h3><p>${money(item.price)} each</p></div><div class="quantity"><button data-minus="${item._id}" aria-label="Remove one">−</button><span>${quantity}</span><button data-plus="${item._id}" aria-label="Add one">+</button></div></div>`).join('') : '<div class="cart-empty">Your cart is ready for something good.</div>'
}

cartItemsElement.addEventListener('click', event => {
  const minus = event.target.closest('[data-minus]')
  const plus = event.target.closest('[data-plus]')
  if (minus) changeQuantity(minus.dataset.minus, -1)
  if (plus) changeQuantity(plus.dataset.plus, 1)
})

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

function startLiveData() {
  menu = fallbackMenu
  renderMenu()
  renderCart()
  if (!convexClient) {
    console.warn('Using local previews because the live data client is unavailable.')
    return
  }
  subscriptions.push(convexClient.onUpdate('menuItems:listAvailable', {}, nextMenu => {
    const nextSignature = JSON.stringify(nextMenu.map(item => [item._id, item.updatedAt, item.isAvailable, item.price, item.imageStorageId, item.imageUrl]))
    if (nextSignature === menuSignature) return
    menuSignature = nextSignature
    menu = nextMenu
    renderMenu(); renderCart()
  }, error => console.warn('Using the local menu preview.', error)))
}

document.querySelector('#checkoutForm').addEventListener('submit', async event => {
  event.preventDefault()
  const message = document.querySelector('#checkoutMessage')
  const button = event.submitter
  if (!convexClient) {
    message.className = 'form-message error'; message.textContent = 'Ordering opens when this site is connected to The Patio’s Convex deployment.'; return
  }
  button.disabled = true; button.textContent = 'Opening Clover…'; message.textContent = ''
  const form = new FormData(event.currentTarget)
  const lines = cartLines()
  try {
    checkoutRequestId ||= crypto.randomUUID()
    const result = await convexClient.action('clover:createHostedCheckout', {
      clientRequestId: checkoutRequestId,
      customerName: form.get('customerName').trim(), phone: form.get('phone').trim(), email: form.get('email').trim(), notes: form.get('notes').trim(), ageConfirmed: form.get('ageConfirmed') === 'on',
      items: lines.map(({ item, quantity }) => ({ menuItemId: item._id, quantity, selectedAddOns: [] }))
    })
    message.className = 'form-message success'; message.textContent = `Opening secure checkout for ${result.orderNumber}…`
    window.location.assign(result.checkoutUrl)
  } catch (error) {
    message.className = 'form-message error'; message.textContent = error?.data?.message || 'We could not open secure checkout. Please try again.'
  } finally { button.disabled = false; button.innerHTML = 'Pay securely with Clover <span>→</span>' }
})

const paymentResult = new URLSearchParams(window.location.search).get('payment')
if (paymentResult) {
  const toast = document.querySelector('#cartToast')
  toast.textContent = paymentResult === 'success' ? 'Payment submitted. Your order will appear when Clover confirms it.' : 'Payment was not completed. Your order was not sent to the bar.'
  toast.classList.add('show')
  window.setTimeout(() => toast.classList.remove('show'), 7000)
}

window.addEventListener('beforeunload', () => {
  subscriptions.forEach(unsubscribe => unsubscribe())
  convexClient?.close()
})
startLiveData()
