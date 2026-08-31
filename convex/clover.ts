import { ConvexError, v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { calculateCouponDiscount, normalizeCouponCode } from "./coupons";

const requestedItem = v.object({
  menuItemId: v.id("menuItems"),
  quantity: v.number(),
  selectedOptions: v.optional(
    v.array(v.object({ groupId: v.id("optionGroups"), optionId: v.string() })),
  ),
  selectedAddOns: v.optional(v.array(v.object({ name: v.string() }))),
});

const checkoutArgs = {
  clientRequestId: v.string(),
  customerName: v.string(),
  phone: v.string(),
  email: v.string(),
  notes: v.string(),
  ageConfirmed: v.boolean(),
  tip: v.optional(v.number()),
  couponCode: v.optional(v.string()),
  items: v.array(requestedItem),
};

type PreparedCheckout = {
  mode: "create" | "reuse" | "in-flight" | "complimentary";
  orderId: string;
  orderNumber: string;
  idempotencyKey: string;
  checkoutUrl?: string;
  checkoutExpiresAt?: number;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  lineItems: Array<{
    name: string;
    price: number;
    unitQty: number;
    note?: string;
  }>;
};

function publicError(message: string) {
  return new ConvexError({ message });
}

export const prepareHostedCheckout = internalMutation({
  args: { ...checkoutArgs, candidateIdempotencyKey: v.string() },
  handler: async (ctx, args): Promise<PreparedCheckout> => {
    const now = Date.now();
    if (!/^[0-9a-f-]{36}$/i.test(args.clientRequestId))
      throw publicError(
        "Invalid checkout request. Please refresh and try again.",
      );
    const existing = await ctx.db
      .query("orders")
      .withIndex("by_client_request_id", (q) =>
        q.eq("clientRequestId", args.clientRequestId),
      )
      .unique();
    if (existing) {
      const common = {
        orderId: String(existing._id),
        orderNumber: existing.orderNumber,
        idempotencyKey:
          existing.checkoutIdempotencyKey || args.candidateIdempotencyKey,
        customer: splitCustomer(
          existing.customerName,
          existing.email || "",
          existing.phone,
        ),
        lineItems: toCloverLineItems(
          existing.items,
          existing.tip || 0,
          existing.discount || 0,
          existing.couponCode,
        ),
      };
      if (existing.paid && existing.total === 0)
        return { mode: "complimentary", ...common };
      if (
        existing.cloverCheckoutUrl &&
        (existing.cloverCheckoutExpiresAt || 0) > now + 30_000
      ) {
        return {
          mode: "reuse",
          ...common,
          checkoutUrl: existing.cloverCheckoutUrl,
          checkoutExpiresAt: existing.cloverCheckoutExpiresAt,
        };
      }
      if (
        existing.checkoutAttemptedAt &&
        existing.checkoutAttemptedAt > now - 30_000 &&
        existing.paymentStatus === "checkout-creating"
      ) {
        return { mode: "in-flight", ...common };
      }
      await ctx.db.patch(existing._id, {
        paymentStatus: "checkout-creating",
        checkoutAttemptedAt: now,
        checkoutError: undefined,
        updatedAt: now,
      });
      return { mode: "create", ...common };
    }

    if (!args.ageConfirmed)
      throw publicError("You must confirm that you are 21 or older.");
    const customerName = args.customerName.trim().replace(/\s+/g, " ");
    const phone = args.phone.trim();
    const email = args.email.trim().toLowerCase();
    if (
      customerName.length < 2 ||
      customerName.length > 100 ||
      phone.replace(/\D/g, "").length < 10
    )
      throw publicError("Please provide a valid name and phone number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      throw publicError("Please provide a valid email address.");
    if (!args.items.length || args.items.length > 30)
      throw publicError(
        args.items.length
          ? "There are too many items in this order."
          : "Your cart is empty.",
      );

    let subtotal = 0;
    let totalQuantity = 0;
    const verifiedItems = [];
    const currentItems = await Promise.all(
      args.items.map((requested) => ctx.db.get(requested.menuItemId)),
    );
    const publicSections = await ctx.db.query("menuCategories").collect();
    const sectionsById = new Map(
      publicSections.map((section) => [String(section._id), section]),
    );
    for (let index = 0; index < args.items.length; index++) {
      const requested = args.items[index];
      const current = currentItems[index];
      if (!current || !current.isAvailable)
        throw publicError(
          `${current?.name || "An item"} is no longer available.`,
        );
      const section = current.sectionId
        ? sectionsById.get(String(current.sectionId))
        : publicSections.find(
            (entry) =>
              entry.name.toLocaleLowerCase() ===
                current.category.toLocaleLowerCase() &&
              entry.kind === (current.isBottleService ? "bottle" : "menu"),
          );
      if (!section?.isAvailable)
        throw publicError(`${current.name} is no longer available.`);
      const quantity = Math.floor(requested.quantity);
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 20)
        throw publicError("An item has an invalid quantity.");
      totalQuantity += quantity;
      const requestedOptions = requested.selectedOptions || [];
      if (requestedOptions.length > 30)
        throw publicError(
          `Too many options were selected for ${current.name}.`,
        );
      const attachedIds = current.optionGroupIds || [];
      const attached = new Set(attachedIds.map(String));
      const groups = (
        await Promise.all(attachedIds.map((groupId) => ctx.db.get(groupId)))
      ).filter(Boolean);
      const requestedByGroup = new Map<string, string[]>();
      const seenSelections = new Set<string>();
      for (const selection of requestedOptions) {
        const groupId = String(selection.groupId);
        const key = `${groupId}:${selection.optionId}`;
        if (!attached.has(groupId) || seenSelections.has(key))
          throw publicError(`An option for ${current.name} is invalid.`);
        seenSelections.add(key);
        requestedByGroup.set(groupId, [
          ...(requestedByGroup.get(groupId) || []),
          selection.optionId,
        ]);
      }
      const selectedAddOns: Array<{ name: string; price: number }> = [];
      for (const group of groups) {
        const selectedIds = requestedByGroup.get(String(group._id)) || [];
        if (!group?.isAvailable) {
          if (selectedIds.length)
            throw publicError(
              `An option for ${current.name} is no longer available.`,
            );
          continue;
        }
        const max = group.selectionMode === "single" ? 1 : group.maxSelections;
        if (
          selectedIds.length < group.minSelections ||
          selectedIds.length > max
        )
          throw publicError(
            `Please complete ${group.name} for ${current.name}.`,
          );
        for (const optionId of selectedIds) {
          const option = group.options.find(
            (option) => option.id === optionId && option.isAvailable,
          );
          if (!option)
            throw publicError(
              `A selected option for ${current.name} is no longer available.`,
            );
          selectedAddOns.push({
            name: `${group.name}: ${option.name}`,
            price: option.price,
          });
        }
      }
      if (
        [...requestedByGroup.keys()].some(
          (groupId) => !groups.some((group) => String(group?._id) === groupId),
        )
      )
        throw publicError(
          `An option for ${current.name} is no longer available.`,
        );
      const addOnTotal = selectedAddOns.reduce(
        (sum, addOn) => sum + addOn.price,
        0,
      );
      subtotal += (current.price + addOnTotal) * quantity;
      verifiedItems.push({
        menuItemId: current._id,
        name: current.name,
        unitPrice: current.price,
        quantity,
        selectedAddOns,
      });
    }
    if (totalQuantity > 50 || subtotal < 0 || subtotal > 500_000)
      throw publicError(
        "This order cannot be processed online. Please contact The Patio.",
      );

    let couponCode: string | undefined;
    let discount = 0;
    if (args.couponCode?.trim()) {
      couponCode = normalizeCouponCode(args.couponCode);
      const coupon = await ctx.db
        .query("coupons")
        .withIndex("by_code", (q) => q.eq("code", couponCode))
        .unique();
      if (!coupon?.isActive)
        throw publicError("That discount code is not valid.");
      discount = calculateCouponDiscount(coupon, subtotal);
    }

    const tip = Math.floor(args.tip || 0);
    if (
      !Number.isFinite(tip) ||
      tip < 0 ||
      tip > subtotal ||
      tip > 100_000
    )
      throw publicError("Please choose a valid tip amount.");

    const total = subtotal - discount + tip;
    const complimentary = total === 0;
    const orderNumber = `P-${now.toString(36).slice(-6).toUpperCase()}`;
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      customerName,
      phone,
      email,
      notes: args.notes.trim().slice(0, 500),
      items: verifiedItems,
      subtotal,
      discount,
      ...(couponCode ? { couponCode } : {}),
      tip,
      total,
      status: complimentary ? "in-progress" : "received",
      paid: complimentary,
      paymentStatus: complimentary ? "approved" : "checkout-creating",
      clientRequestId: args.clientRequestId,
      checkoutIdempotencyKey: args.candidateIdempotencyKey,
      ...(complimentary
        ? { paymentUpdatedAt: now }
        : { checkoutAttemptedAt: now }),
      ageConfirmed: true,
      createdAt: now,
      updatedAt: now,
    });
    if (complimentary)
      await ctx.scheduler.runAfter(0, internal.notifications.sendOrder, {
        orderId,
      });
    return {
      mode: complimentary ? "complimentary" : "create",
      orderId: String(orderId),
      orderNumber,
      idempotencyKey: args.candidateIdempotencyKey,
      customer: splitCustomer(customerName, email, phone),
      lineItems: toCloverLineItems(verifiedItems, tip, discount, couponCode),
    };
  },
});

export const saveHostedCheckout = internalMutation({
  args: {
    orderId: v.id("orders"),
    checkoutSessionId: v.string(),
    checkoutUrl: v.string(),
    checkoutExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found while saving checkout.");
    if (
      order.cloverCheckoutSessionId &&
      order.cloverCheckoutSessionId !== args.checkoutSessionId
    )
      throw new Error("Checkout session conflict.");
    await ctx.db.patch(args.orderId, {
      cloverCheckoutSessionId: args.checkoutSessionId,
      cloverCheckoutUrl: args.checkoutUrl,
      cloverCheckoutExpiresAt: args.checkoutExpiresAt,
      paymentStatus: "checkout-created",
      checkoutError: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const saveCheckoutError = internalMutation({
  args: { orderId: v.id("orders"), message: v.string() },
  handler: async (ctx, { orderId, message }) => {
    const order = await ctx.db.get(orderId);
    if (order && !order.paid)
      await ctx.db.patch(orderId, {
        paymentStatus: "checkout-error",
        checkoutError: message.slice(0, 240),
        updatedAt: Date.now(),
      });
  },
});

export const recordWebhookPayment = internalMutation({
  args: {
    checkoutSessionId: v.string(),
    paymentId: v.string(),
    approved: v.boolean(),
  },
  handler: async (ctx, { checkoutSessionId, paymentId, approved }) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_clover_checkout_session", (q) =>
        q.eq("cloverCheckoutSessionId", checkoutSessionId),
      )
      .unique();
    if (!order) return { found: false, alreadyProcessed: false };
    if (order.paid && order.paymentStatus === "approved") {
      if (order.status === "received")
        await ctx.db.patch(order._id, {
          status: "in-progress",
          updatedAt: Date.now(),
        });
      return { found: true, alreadyProcessed: true };
    }
    const now = Date.now();
    await ctx.db.patch(order._id, {
      paid: approved,
      paymentStatus: approved ? "approved" : "declined",
      ...(approved && order.status === "received"
        ? { status: "in-progress" as const }
        : {}),
      cloverPaymentId: paymentId || order.cloverPaymentId,
      paymentUpdatedAt: now,
      updatedAt: now,
    });
    if (approved)
      await ctx.scheduler.runAfter(0, internal.notifications.sendOrder, {
        orderId: order._id,
      });
    return { found: true, alreadyProcessed: false };
  },
});

export const createHostedCheckout = action({
  args: checkoutArgs,
  handler: async (
    ctx,
    args,
  ): Promise<{
    orderNumber: string;
    checkoutUrl?: string;
    reused: boolean;
    complimentary: boolean;
  }> => {
    const prepared: PreparedCheckout = await ctx.runMutation(
      internal.clover.prepareHostedCheckout,
      {
        ...args,
        candidateIdempotencyKey: crypto.randomUUID(),
      },
    );
    if (prepared.mode === "complimentary")
      return {
        orderNumber: prepared.orderNumber,
        reused: false,
        complimentary: true,
      };
    if (prepared.mode === "reuse" && prepared.checkoutUrl)
      return {
        orderNumber: prepared.orderNumber,
        checkoutUrl: prepared.checkoutUrl,
        reused: true,
        complimentary: false,
      };
    if (prepared.mode === "in-flight")
      throw publicError(
        "Your secure checkout is already being prepared. Please wait a moment and try again.",
      );

    const merchantId = process.env.CLOVER_MERCHANT_ID;
    const privateToken = process.env.CLOVER_PRIVATE_TOKEN;
    if (!merchantId || !privateToken)
      throw publicError(
        "Online payments are not configured yet. Please let The Patio staff know.",
      );
    const baseUrl = (
      process.env.CLOVER_API_BASE_URL || "https://api.clover.com"
    ).replace(/\/$/, "");
    if (
      !["https://api.clover.com", "https://apisandbox.dev.clover.com"].includes(
        baseUrl,
      )
    )
      throw new Error(
        "CLOVER_API_BASE_URL is not an approved Clover API host.",
      );

    const body: Record<string, unknown> = {
      customer: prepared.customer,
      shoppingCart: { lineItems: prepared.lineItems },
    };
    const publicSiteUrl = process.env.PUBLIC_SITE_URL?.replace(/\/$/, "");
    if (publicSiteUrl?.startsWith("https://"))
      body.redirectUrls = {
        success: `${publicSiteUrl}/order-status.html?payment=success`,
        failure: `${publicSiteUrl}/menu.html?payment=failure`,
      };

    try {
      const response = await fetch(
        `${baseUrl}/invoicingcheckoutservice/v1/checkouts`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${privateToken}`,
            "X-Clover-Merchant-Id": merchantId,
            "Idempotency-Key": prepared.idempotencyKey,
            "User-Agent": "ThePatioWeb/1.0 (Hosted Checkout)",
          },
          body: JSON.stringify(body),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok)
        throw new Error(cloverFailure(response.status, payload));
      const checkoutUrl = typeof payload.href === "string" ? payload.href : "";
      const checkoutSessionId =
        typeof payload.checkoutSessionId === "string"
          ? payload.checkoutSessionId
          : "";
      const checkoutExpiresAt =
        typeof payload.expirationTime === "number"
          ? payload.expirationTime
          : Date.now() + 15 * 60_000;
      if (!checkoutUrl.startsWith("https://") || !checkoutSessionId)
        throw new Error("Clover returned an incomplete checkout session.");
      await ctx.runMutation(internal.clover.saveHostedCheckout, {
        orderId: prepared.orderId as never,
        checkoutSessionId,
        checkoutUrl,
        checkoutExpiresAt,
      });
      return {
        orderNumber: prepared.orderNumber,
        checkoutUrl,
        reused: false,
        complimentary: false,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Clover checkout request failed.";
      await ctx.runMutation(internal.clover.saveCheckoutError, {
        orderId: prepared.orderId as never,
        message,
      });
      throw publicError(
        "We could not open Clover checkout. Your card was not charged. Please try again.",
      );
    }
  },
});

function splitCustomer(name: string, email: string, phone: string) {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts.shift() || name,
    lastName: parts.join(" ") || "-",
    email,
    phoneNumber: phone,
  };
}

function toCloverLineItems(
  items: Array<{
    name: string;
    unitPrice: number;
    quantity: number;
    selectedAddOns: Array<{ name: string; price: number }>;
  }>,
  tip = 0,
  discount = 0,
  couponCode?: string,
) {
  let remainingDiscount = discount;
  const lines: PreparedCheckout["lineItems"] = items.flatMap((item) =>
    Array.from({ length: item.quantity }, () => {
      const originalPrice =
        item.unitPrice +
        item.selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
      const reduction = Math.min(originalPrice, remainingDiscount);
      remainingDiscount -= reduction;
      const notes = [
        item.selectedAddOns.length
          ? item.selectedAddOns.map((addOn) => addOn.name).join(", ")
          : "",
        reduction && couponCode ? `${couponCode} discount applied` : "",
      ].filter(Boolean);
      return {
        name: item.name,
        unitQty: 1,
        price: originalPrice - reduction,
        ...(notes.length ? { note: notes.join(" · ") } : {}),
      };
    }),
  ).filter((line) => line.price > 0);
  if (tip > 0)
    lines.push({ name: "Tip", unitQty: 1, price: tip });
  return lines;
}

function cloverFailure(status: number, payload: Record<string, unknown>) {
  const detail = [
    payload.message,
    payload.error,
    payload.error_description,
  ].find((value) => typeof value === "string");
  return `Clover checkout failed (${status})${detail ? `: ${String(detail).slice(0, 160)}` : ""}`;
}
