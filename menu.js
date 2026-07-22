const { fallbackMenu } = window.PatioData;
const { escapeHtml, money } = window.PatioUtils;

const menuGrid = document.querySelector("#menuGrid");
const categoryNav = document.querySelector("#categoryNav");
const drawer = document.querySelector("#cartDrawer");
const checkoutDialog = document.querySelector("#checkoutDialog");
const customizeDialog = document.querySelector("#customizeDialog");
const customizeForm = document.querySelector("#customizeForm");
const customizeGroups = document.querySelector("#customizeGroups");
const cartItemsElement = document.querySelector("#cartItems");
const cart = new Map();
const convexClient =
  window.PATIO_CONFIG?.convexUrl && window.PatioConvex
    ? new window.PatioConvex.ConvexClient(window.PATIO_CONFIG.convexUrl)
    : null;
let menu = [];
let menuSignature = "";
let activeCategory = "All";
let checkoutRequestId = null;
let customizingItemId = null;
let selectedTipPercent = 20;
let appliedCoupon = null;
let toastTimer;
const subscriptions = [];

function renderMenu() {
  const available = menu
    .filter((item) => item.isAvailable)
    .sort((left, right) => {
      const leftRank = left.isDrinkOfNight ? 0 : left.isFeatured ? 1 : 2;
      const rightRank = right.isDrinkOfNight ? 0 : right.isFeatured ? 1 : 2;
      return (
        leftRank - rightRank || (left.sortOrder || 0) - (right.sortOrder || 0)
      );
    });
  const regularItems = available.filter((item) => !item.isBottleService);
  const bottleItems = available.filter((item) => item.isBottleService);
  const categories = [
    ...new Set(regularItems.map((item) => item.category || "Menu")),
    ...(bottleItems.length ? ["Bottle Service"] : []),
  ];
  if (activeCategory !== "All" && !categories.includes(activeCategory))
    activeCategory = "All";
  categoryNav.innerHTML = ["All", ...categories]
    .map(
      (category) =>
        `<button type="button" class="${category === activeCategory ? "active" : ""}" data-category="${escapeHtml(category)}" aria-pressed="${category === activeCategory}">${escapeHtml(category)}</button>`,
    )
    .join("");
  const card = (item) => {
          const badge = item.isBottleService
            ? '<span class="menu-card-badge custom-badge">Bottle Service</span>'
            : item.isDrinkOfNight
            ? '<span class="menu-card-badge night-badge">Drink of the Night</span>'
            : item.isCustomDrink
              ? '<span class="menu-card-badge custom-badge">Build Your Own</span>'
              : item.isFeatured
                ? '<span class="menu-card-badge">Featured</span>'
                : "";
          const priceLabel = item.isCustomDrink
            ? `Starting at ${money(item.price)}`
            : `${money(item.price)}${item.optionGroups?.some((group) => group.options.some((option) => option.price)) ? "+" : ""}`;
          const actionLabel = "Add";
          return `<article class="menu-card${item.isFeatured ? " is-featured" : ""}${item.isDrinkOfNight ? " drink-of-night" : ""}${item.isCustomDrink ? " custom-drink" : ""}${item.isBottleService ? " bottle-service-card" : ""}"><div class="menu-card-media">${badge}${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" width="800" height="600" loading="lazy" decoding="async" alt="${escapeHtml(item.name)}">` : '<div class="menu-photo-placeholder"><span>Photo coming soon</span></div>'}<button type="button" class="add-button" data-add="${item._id}" aria-label="${actionLabel} ${escapeHtml(item.name)}"><span>${actionLabel}</span><b aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M10 4v12M4 10h12" /></svg></b></button></div><div class="menu-card-body"><div class="menu-card-top"><h3>${escapeHtml(item.name)}</h3><span class="menu-card-price">${priceLabel}</span></div><p>${escapeHtml(item.description)}</p></div></article>`;
  };
  const visibleRegular = activeCategory === "All"
    ? regularItems
    : regularItems.filter((item) => (item.category || "Menu") === activeCategory);
  const visibleBottles = activeCategory === "All" || activeCategory === "Bottle Service"
    ? bottleItems
    : [];
  menuGrid.innerHTML = visibleRegular.length || visibleBottles.length
    ? `${visibleRegular.length ? `<div class="menu-items-grid">${visibleRegular.map(card).join("")}</div>` : ""}${visibleBottles.length ? `<section class="bottle-service-section"><div class="bottle-service-heading"><p class="eyebrow dark">Reserve the table</p><h2>Bottle Service</h2><span>Choose your bottles, included drinks and chasers.</span></div><div class="menu-items-grid">${visibleBottles.map(card).join("")}</div></section>` : ""}`
    : '<div class="empty-state">No drinks are available in this category right now.</div>';
}

categoryNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderMenu();
});

menuGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  const item = menu.find(
    (row) => String(row._id) === String(button.dataset.add),
  );
  if (!item) return;
  item.optionGroups?.length
    ? openCustomizer(item)
    : addConfiguredItem(item, []);
});

function configurationKey(itemId, selectedOptions) {
  return `${itemId}:${
    selectedOptions
      .map((option) => `${option.groupId}.${option.optionId}`)
      .sort()
      .join("|") || "base"
  }`;
}
function cartLines() {
  return [...cart.entries()]
    .map(([key, line]) => ({
      key,
      ...line,
      item: menu.find((row) => String(row._id) === String(line.itemId)),
    }))
    .filter((line) => line.item);
}
function optionDetails(item, selectedOptions) {
  return selectedOptions
    .map((selection) => {
      const group = item.optionGroups?.find(
        (entry) => String(entry._id) === String(selection.groupId),
      );
      const option = group?.options.find(
        (entry) => entry.id === selection.optionId,
      );
      return group && option
        ? {
            ...selection,
            groupName: group.name,
            name: option.name,
            price: option.price,
          }
        : null;
    })
    .filter(Boolean);
}
function lineUnitPrice(item, selectedOptions) {
  return (
    item.price +
    optionDetails(item, selectedOptions).reduce(
      (sum, option) => sum + option.price,
      0,
    )
  );
}
function addConfiguredItem(item, selectedOptions) {
  const key = configurationKey(item._id, selectedOptions);
  const existing = cart.get(key);
  cart.set(key, {
    itemId: item._id,
    selectedOptions,
    quantity: (existing?.quantity || 0) + 1,
  });
  checkoutRequestId = null;
  clearAppliedCoupon();
  renderCart();
  showAdded(item._id);
}
function changeQuantity(key, delta) {
  const line = cart.get(key);
  if (!line) return;
  const next = line.quantity + delta;
  next > 0 ? cart.set(key, { ...line, quantity: next }) : cart.delete(key);
  checkoutRequestId = null;
  clearAppliedCoupon();
  renderCart();
}

function openCustomizer(item) {
  customizingItemId = item._id;
  document.querySelector("#customizeEyebrow").textContent = item.isBottleService
    ? "Bottle Service"
    : item.isCustomDrink
      ? "Build Your Own"
      : "Make it yours";
  document.querySelector("#customizeTitle").textContent = item.name;
  document.querySelector("#customizeDescription").textContent =
    item.description;
  customizeGroups.innerHTML = item.optionGroups
    .map((group, groupIndex) => {
      const inputType = group.selectionMode === "single" ? "radio" : "checkbox";
      const requirement = group.minSelections
        ? `Choose ${group.minSelections}${group.maxSelections > group.minSelections ? `–${group.maxSelections}` : ""}`
        : `Optional · up to ${group.maxSelections}`;
      return `<fieldset class="customize-group" data-group-id="${group._id}" data-min="${group.minSelections}" data-max="${group.selectionMode === "single" ? 1 : group.maxSelections}"><legend>${escapeHtml(group.name)} <span>${escapeHtml(requirement)}</span></legend>${group.description ? `<p>${escapeHtml(group.description)}</p>` : ""}<div>${group.options.map((option) => `<label><input type="${inputType}" name="option-group-${groupIndex}" value="${escapeHtml(option.id)}" data-price="${option.price}"><span><strong>${escapeHtml(option.name)}</strong>${option.description ? `<small>${escapeHtml(option.description)}</small>` : ""}</span><b>${option.price ? `+${money(option.price)}` : "Included"}</b></label>`).join("")}</div></fieldset>`;
    })
    .join("");
  document.querySelector("#customizeMessage").textContent = "";
  updateCustomizeTotal();
  customizeDialog.showModal();
}
function chosenOptions() {
  return [...customizeGroups.querySelectorAll(".customize-group")].flatMap(
    (fieldset) =>
      [...fieldset.querySelectorAll("input:checked")].map((input) => ({
        groupId: fieldset.dataset.groupId,
        optionId: input.value,
      })),
  );
}
function updateCustomizeTotal() {
  const item = menu.find(
    (row) => String(row._id) === String(customizingItemId),
  );
  if (!item) return;
  document.querySelector("#addCustomized").textContent =
    `Add to order · ${money(lineUnitPrice(item, chosenOptions()))}`;
}
customizeForm.addEventListener("input", updateCustomizeTotal);
customizeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const invalid = [
    ...customizeGroups.querySelectorAll(".customize-group"),
  ].find((fieldset) => {
    const count = fieldset.querySelectorAll("input:checked").length;
    return (
      count < Number(fieldset.dataset.min) ||
      count > Number(fieldset.dataset.max)
    );
  });
  if (invalid) {
    document.querySelector("#customizeMessage").textContent =
      `Please complete ${invalid.querySelector("legend").childNodes[0].textContent.trim()}.`;
    invalid.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const item = menu.find(
    (row) => String(row._id) === String(customizingItemId),
  );
  if (item) addConfiguredItem(item, chosenOptions());
  customizeDialog.close();
});
document.querySelector("#closeCustomize").onclick = () =>
  customizeDialog.close();

function showAdded(id) {
  const item = menu.find((row) => String(row._id) === String(id));
  const toast = document.querySelector("#cartToast");
  toast.textContent = `${item?.name || "Drink"} added to your cart`;
  toast.classList.add("show");
  document.querySelector("#cartButton").classList.remove("cart-bump");
  requestAnimationFrame(() =>
    document.querySelector("#cartButton").classList.add("cart-bump"),
  );
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}
function renderCart() {
  const lines = cartLines();
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce(
    (sum, line) =>
      sum + lineUnitPrice(line.item, line.selectedOptions) * line.quantity,
    0,
  );
  document.querySelector("#cartCount").textContent = count;
  document.querySelector("#cartTotal").textContent = money(total);
  document.querySelector("#cartPreviewTotal").textContent = money(total);
  cartItemsElement.innerHTML = lines.length
    ? lines
        .map(({ key, item, selectedOptions, quantity }) => {
          const options = optionDetails(item, selectedOptions);
          return `<div class="cart-item">${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" width="64" height="64" alt="">` : '<span class="cart-item-placeholder">P</span>'}<div><h3>${escapeHtml(item.name)}</h3>${options.length ? `<p class="cart-options">${options.map((option) => escapeHtml(option.name)).join(" · ")}</p>` : ""}<p>${money(lineUnitPrice(item, selectedOptions))} each</p></div><div class="quantity"><button data-minus="${escapeHtml(key)}" aria-label="Remove one">−</button><span>${quantity}</span><button data-plus="${escapeHtml(key)}" aria-label="Add one">+</button></div></div>`;
        })
        .join("")
    : '<div class="cart-empty">Your cart is ready for something good.</div>';
}

function cartSubtotal() {
  return cartLines().reduce(
    (sum, line) =>
      sum + lineUnitPrice(line.item, line.selectedOptions) * line.quantity,
    0,
  );
}

function selectedTip() {
  const custom = document.querySelector("#customTip");
  if (custom?.value !== "")
    return Math.max(0, Math.round(Number(custom.value || 0) * 100));
  return Math.round((cartSubtotal() * selectedTipPercent) / 100);
}

function renderCheckoutTotal() {
  const discount = Math.min(appliedCoupon?.discount || 0, cartSubtotal());
  document.querySelector("#checkoutTotal").textContent = money(
    cartSubtotal() - discount + selectedTip(),
  );
  const discountRow = document.querySelector("#checkoutDiscount");
  discountRow.hidden = !discount;
  document.querySelector("#checkoutDiscountAmount").textContent = `−${money(discount)}`;
}

function clearAppliedCoupon(clearInput = false) {
  appliedCoupon = null;
  const input = document.querySelector("#couponCode");
  const message = document.querySelector("#couponMessage");
  if (clearInput && input) input.value = "";
  if (message) {
    message.className = "";
    message.textContent = "";
  }
  renderCheckoutTotal();
}
cartItemsElement.addEventListener("click", (event) => {
  const minus = event.target.closest("[data-minus]");
  const plus = event.target.closest("[data-plus]");
  if (minus) changeQuantity(minus.dataset.minus, -1);
  if (plus) changeQuantity(plus.dataset.plus, 1);
});

function openCart() {
  document.body.classList.add("cart-open");
  drawer.setAttribute("aria-hidden", "false");
}
function closeCart() {
  document.body.classList.remove("cart-open");
  drawer.setAttribute("aria-hidden", "true");
}
document.querySelector("#cartButton").onclick = openCart;
document.querySelector("#closeCart").onclick = closeCart;
document.querySelector("#scrim").onclick = closeCart;
document.querySelector("#checkoutButton").onclick = () => {
  if (cart.size) {
    closeCart();
    renderCheckoutTotal();
    checkoutDialog.showModal();
  }
};
document.querySelector("#closeCheckout").onclick = () => checkoutDialog.close();
document.querySelector("#tipOptions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-tip-percent]");
  if (!button) return;
  selectedTipPercent = Number(button.dataset.tipPercent);
  document.querySelector("#customTip").value = "";
  document.querySelectorAll("[data-tip-percent]").forEach((option) =>
    option.classList.toggle("active", option === button),
  );
  checkoutRequestId = null;
  renderCheckoutTotal();
});
document.querySelector("#customTip").addEventListener("input", () => {
  document.querySelectorAll("[data-tip-percent]").forEach((option) =>
    option.classList.remove("active"),
  );
  checkoutRequestId = null;
  renderCheckoutTotal();
});

document.querySelector("#couponCode").addEventListener("input", () => {
  if (appliedCoupon) clearAppliedCoupon();
  checkoutRequestId = null;
});
document.querySelector("#applyCoupon").addEventListener("click", async () => {
  const input = document.querySelector("#couponCode");
  const message = document.querySelector("#couponMessage");
  const button = document.querySelector("#applyCoupon");
  const code = input.value.trim().toUpperCase();
  input.value = code;
  if (!convexClient || !code) {
    message.className = "error";
    message.textContent = "Enter a discount code.";
    return;
  }
  button.disabled = true;
  message.className = "";
  message.textContent = "Checking code…";
  try {
    const result = await convexClient.query("coupons:validate", {
      code,
      subtotal: cartSubtotal(),
    });
    if (!result.valid) {
      appliedCoupon = null;
      message.className = "error";
      message.textContent = result.message;
    } else {
      appliedCoupon = result;
      checkoutRequestId = null;
      message.className = "success";
      message.textContent = `${result.code} applied — ${result.label}.`;
    }
    renderCheckoutTotal();
  } catch {
    appliedCoupon = null;
    message.className = "error";
    message.textContent = "We could not check that code. Please try again.";
    renderCheckoutTotal();
  } finally {
    button.disabled = false;
  }
});

function startLiveData() {
  menu = fallbackMenu;
  renderMenu();
  renderCart();
  if (!convexClient) {
    console.warn(
      "Using local previews because the live data client is unavailable.",
    );
    return;
  }
  subscriptions.push(
    convexClient.onUpdate(
      "menuItems:listAvailable",
      {},
      (nextMenu) => {
        const nextSignature = JSON.stringify(
          nextMenu.map((item) => [item._id, item.updatedAt, item.imageUrl]),
        );
        if (nextSignature === menuSignature) return;
        menuSignature = nextSignature;
        menu = nextMenu;
        renderMenu();
        renderCart();
      },
      (error) => console.warn("Using the local menu preview.", error),
    ),
  );
}

document
  .querySelector("#checkoutForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#checkoutMessage");
    const button = event.submitter;
    if (!convexClient) {
      message.className = "form-message error";
      message.textContent =
        "Ordering opens when this site is connected to The Patio’s Convex deployment.";
      return;
    }
    button.disabled = true;
    button.textContent = "Submitting order…";
    message.textContent = "";
    const form = new FormData(event.currentTarget);
    try {
      checkoutRequestId ||= crypto.randomUUID();
      const result = await convexClient.action("clover:createHostedCheckout", {
        clientRequestId: checkoutRequestId,
        customerName: form.get("customerName").trim(),
        phone: form.get("phone").trim(),
        email: form.get("email").trim(),
        notes: form.get("notes").trim(),
        ageConfirmed: form.get("ageConfirmed") === "on",
        tip: selectedTip(),
        ...(appliedCoupon?.code ? { couponCode: appliedCoupon.code } : {}),
        items: cartLines().map(({ item, quantity, selectedOptions }) => ({
          menuItemId: item._id,
          quantity,
          selectedOptions,
        })),
      });
      message.className = "form-message success";
      if (result.complimentary) {
        message.textContent = `Order ${result.orderNumber} submitted.`;
        window.location.assign("order-status.html?payment=complimentary");
      } else {
        message.textContent = `Opening secure checkout for ${result.orderNumber}…`;
        window.location.assign(result.checkoutUrl);
      }
    } catch (error) {
      message.className = "form-message error";
      message.textContent =
        error?.data?.message ||
        "We could not open secure checkout. Please try again.";
    } finally {
      button.disabled = false;
      button.textContent = "Continue to payment";
    }
  });

const paymentResult = new URLSearchParams(window.location.search).get(
  "payment",
);
if (paymentResult) {
  const toast = document.querySelector("#cartToast");
  toast.textContent =
    paymentResult === "success"
      ? "Payment submitted. Your order will appear when Clover confirms it."
      : "Payment was not completed. Your order was not sent to the bar.";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 7000);
}
window.addEventListener("beforeunload", () => {
  subscriptions.forEach((unsubscribe) => unsubscribe());
  convexClient?.close();
});
startLiveData();
