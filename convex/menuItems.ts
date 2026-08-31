import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

const addOns = v.array(
  v.object({ name: v.string(), price: v.number(), isAvailable: v.boolean() }),
);
const itemType = v.union(
  v.literal("cocktail"),
  v.literal("pour"),
  v.literal("shot"),
  v.literal("flask"),
  v.literal("bottle"),
  v.literal("package"),
  v.literal("wine"),
  v.literal("beer"),
  v.literal("non-alcoholic"),
  v.literal("hookah"),
  v.literal("custom"),
);
const fields = {
  name: v.string(),
  category: v.string(),
  sectionId: v.optional(v.id("menuCategories")),
  itemType: v.optional(itemType),
  description: v.string(),
  price: v.number(),
  accent: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  imageStorageId: v.optional(v.id("_storage")),
  isAvailable: v.boolean(),
  isFeatured: v.optional(v.boolean()),
  isDrinkOfNight: v.optional(v.boolean()),
  isCustomDrink: v.optional(v.boolean()),
  isBottleService: v.optional(v.boolean()),
  showsStartingPrice: v.optional(v.boolean()),
  optionGroupIds: v.optional(v.array(v.id("optionGroups"))),
  sortOrder: v.number(),
  addOns,
};
const slugify = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function defaultItemType(item: any) {
  if (item.itemType) return item.itemType;
  if (item.isCustomDrink) return "custom";
  if (item.isBottleService)
    return item.optionGroupIds?.length ? "package" : "bottle";
  if (/hookah/i.test(item.category) || /hookah/i.test(item.name))
    return "hookah";
  if (/shot/i.test(item.category) || /shot/i.test(item.name)) return "shot";
  if (/flask/i.test(item.name)) return "flask";
  return "cocktail";
}

async function resolveSection(ctx: any, item: any) {
  let section = item.sectionId ? await ctx.db.get(item.sectionId) : null;
  if (!section && item.category) {
    const categories = await ctx.db.query("menuCategories").collect();
    section = categories.find(
      (entry: any) =>
        entry.name.toLocaleLowerCase() === item.category.toLocaleLowerCase() &&
        entry.kind === (item.isBottleService ? "bottle" : "menu"),
    );
  }
  if (!section) {
    if (item.isAvailable)
      throw new Error("Choose a public section before showing this item.");
    return null;
  }
  const expectedKind = item.isBottleService ? "bottle" : "menu";
  if (section.kind !== expectedKind)
    throw new Error(
      item.isBottleService
        ? "Choose a Bottle Service section for this item."
        : "Choose a standard public section for this item.",
    );
  return section;
}
async function withImage(ctx: any, item: any) {
  return {
    ...item,
    imageUrl: item.imageStorageId
      ? await ctx.storage.getUrl(item.imageStorageId)
      : item.imageUrl,
  };
}
function featuredFirst(left: any, right: any) {
  const leftRank = left.isDrinkOfNight ? 0 : left.isFeatured ? 1 : 2;
  const rightRank = right.isDrinkOfNight ? 0 : right.isFeatured ? 1 : 2;
  return leftRank - rightRank || left.sortOrder - right.sortOrder;
}
async function clearOtherDrinkOfNight(ctx: any, exceptId?: any) {
  const rows = await ctx.db.query("menuItems").collect();
  await Promise.all(
    rows
      .filter((row: any) => row.isDrinkOfNight && row._id !== exceptId)
      .map((row: any) =>
        ctx.db.patch(row._id, { isDrinkOfNight: false, updatedAt: Date.now() }),
      ),
  );
}
async function validateOptionGroups(ctx: any, ids: any[] = []) {
  if (new Set(ids.map(String)).size !== ids.length)
    throw new Error("A pricing group was selected more than once.");
  const groups = await Promise.all(ids.map((id) => ctx.db.get(id)));
  if (groups.some((group) => !group))
    throw new Error("One of the selected pricing groups no longer exists.");
}

export const listAvailable = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("menuItems")
      .withIndex("by_available_sort", (q) => q.eq("isAvailable", true))
      .collect();
    rows.sort(featuredFirst);
    const groups = await ctx.db
      .query("optionGroups")
      .withIndex("by_sort_order")
      .collect();
    const categories = await ctx.db.query("menuCategories").collect();
    const categoriesById = new Map(
      categories.map((category) => [String(category._id), category]),
    );
    const categoryMap = new Map(
      categories.map((category) => [
        `${category.kind}:${category.name.toLocaleLowerCase()}`,
        category,
      ]),
    );
    const groupMap = new Map(
      groups
        .filter((group) => group.isAvailable)
        .map((group) => [
          String(group._id),
          {
            ...group,
            options: group.options
              .filter((option) => option.isAvailable)
              .sort((a, b) => a.sortOrder - b.sortOrder),
          },
        ]),
    );
    return Promise.all(
      rows
        .filter((row) => {
          const category = row.sectionId
            ? categoriesById.get(String(row.sectionId))
            : categoryMap.get(
                `${row.isBottleService ? "bottle" : "menu"}:${row.category.toLocaleLowerCase()}`,
              );
          return category?.isAvailable !== false;
        })
        .map(async (row) => {
          const category = row.sectionId
            ? categoriesById.get(String(row.sectionId))
            : categoryMap.get(
                `${row.isBottleService ? "bottle" : "menu"}:${row.category.toLocaleLowerCase()}`,
              );
          return {
            ...(await withImage(ctx, row)),
            sectionId: category?._id,
            category: category?.name || row.category,
            itemType: defaultItemType(row),
            categorySortOrder: category?.sortOrder ?? Number.MAX_SAFE_INTEGER,
            optionGroups: (row.optionGroupIds || [])
              .map((id) => groupMap.get(String(id)))
              .filter(Boolean),
          };
        }),
    );
  },
});

export const listPublicCatalog = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_available_sort", (q) => q.eq("isAvailable", true))
      .collect();
    const categories = await ctx.db.query("menuCategories").collect();
    const groups = await ctx.db
      .query("optionGroups")
      .withIndex("by_sort_order")
      .collect();
    const categoriesById = new Map(
      categories.map((category) => [String(category._id), category]),
    );
    const categoriesByLegacyKey = new Map(
      categories.map((category) => [
        `${category.kind}:${category.name.toLocaleLowerCase()}`,
        category,
      ]),
    );
    const groupMap = new Map(
      groups
        .filter((group) => group.isAvailable)
        .map((group) => [
          String(group._id),
          {
            ...group,
            options: group.options
              .filter((option) => option.isAvailable)
              .sort((left, right) => left.sortOrder - right.sortOrder),
          },
        ]),
    );
    const itemsBySection = new Map<string, any[]>();
    for (const item of items) {
      const section = item.sectionId
        ? categoriesById.get(String(item.sectionId))
        : categoriesByLegacyKey.get(
            `${item.isBottleService ? "bottle" : "menu"}:${item.category.toLocaleLowerCase()}`,
          );
      if (!section?.isAvailable) continue;
      const enriched = {
        ...(await withImage(ctx, item)),
        sectionId: section._id,
        category: section.name,
        itemType: defaultItemType(item),
        optionGroups: (item.optionGroupIds || [])
          .map((id) => groupMap.get(String(id)))
          .filter(Boolean),
      };
      const sectionItems = itemsBySection.get(String(section._id)) || [];
      sectionItems.push(enriched);
      itemsBySection.set(String(section._id), sectionItems);
    }
    return {
      sections: categories
        .filter(
          (section) =>
            section.isAvailable &&
            (itemsBySection.get(String(section._id))?.length || 0) > 0,
        )
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((section) => ({
          _id: section._id,
          name: section.name,
          slug: section.slug || slugify(section.name),
          description: section.description || "",
          sectionType:
            section.sectionType ||
            (section.kind === "bottle" ? "bottle-service" : "specialty"),
          sortOrder: section.sortOrder,
          items: (itemsBySection.get(String(section._id)) || []).sort(
            featuredFirst,
          ),
        })),
    };
  },
});
export const adminList = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    const rows = await ctx.db
      .query("menuItems")
      .withIndex("by_sort_order")
      .collect();
    return Promise.all(rows.map((row) => withImage(ctx, row)));
  },
});
export const generateUploadUrl = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireAdmin(ctx, sessionToken);
    return ctx.storage.generateUploadUrl();
  },
});
export const create = mutation({
  args: { sessionToken: v.string(), ...fields },
  handler: async (ctx, { sessionToken, ...item }) => {
    await requireAdmin(ctx, sessionToken);
    await validateOptionGroups(ctx, item.optionGroupIds);
    const section = await resolveSection(ctx, item);
    if (item.isDrinkOfNight) await clearOtherDrinkOfNight(ctx);
    const now = Date.now();
    return ctx.db.insert("menuItems", {
      ...item,
      sectionId: section?._id,
      category: section?.name || item.category.trim(),
      itemType: defaultItemType(item),
      isFeatured: item.isFeatured ?? false,
      isDrinkOfNight: item.isDrinkOfNight ?? false,
      isCustomDrink: item.isCustomDrink ?? false,
      isBottleService: item.isBottleService ?? false,
      showsStartingPrice:
        item.showsStartingPrice ??
        (item.isCustomDrink === true || item.isBottleService === true),
      optionGroupIds: item.optionGroupIds ?? [],
      name: item.name.trim(),
      description: item.description.trim(),
      createdAt: now,
      updatedAt: now,
    });
  },
});
export const update = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("menuItems"),
    removeImage: v.optional(v.boolean()),
    ...fields,
  },
  handler: async (ctx, { sessionToken, id, removeImage, ...item }) => {
    await requireAdmin(ctx, sessionToken);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Menu item not found.");
    await validateOptionGroups(ctx, item.optionGroupIds);
    const mergedItem = { ...existing, ...item };
    const section = await resolveSection(ctx, mergedItem);
    if (item.isDrinkOfNight) await clearOtherDrinkOfNight(ctx, id);
    const replacing = Boolean(
      item.imageStorageId && item.imageStorageId !== existing.imageStorageId,
    );
    if (existing.imageStorageId && (replacing || removeImage))
      await ctx.storage.delete(existing.imageStorageId);
    await ctx.db.patch(id, {
      ...item,
      sectionId: section?._id,
      category: section?.name || item.category.trim(),
      itemType: defaultItemType(mergedItem),
      isFeatured: item.isFeatured ?? false,
      isDrinkOfNight: item.isDrinkOfNight ?? false,
      isCustomDrink: item.isCustomDrink ?? false,
      isBottleService: item.isBottleService ?? false,
      showsStartingPrice:
        item.showsStartingPrice ??
        (item.isCustomDrink === true || item.isBottleService === true),
      optionGroupIds: item.optionGroupIds ?? [],
      ...(item.imageStorageId ? { imageUrl: undefined } : {}),
      ...(removeImage
        ? { imageUrl: undefined, imageStorageId: undefined }
        : {}),
      name: item.name.trim(),
      description: item.description.trim(),
      updatedAt: Date.now(),
    });
  },
});

export const reorder = mutation({
  args: {
    sessionToken: v.string(),
    ids: v.array(v.id("menuItems")),
  },
  handler: async (ctx, { sessionToken, ids }) => {
    await requireAdmin(ctx, sessionToken);
    if (new Set(ids.map(String)).size !== ids.length)
      throw new Error("A menu item was included more than once.");

    const items = await Promise.all(ids.map((id) => ctx.db.get(id)));
    if (items.some((item) => !item))
      throw new Error("One of these menu items no longer exists.");

    const bottleService = items[0]?.isBottleService ?? false;
    if (
      items.some((item) => (item?.isBottleService ?? false) !== bottleService)
    )
      throw new Error(
        "Drinks and bottle-service packages must be reordered separately.",
      );

    const allItems = await ctx.db.query("menuItems").collect();
    const matchingItems = allItems.filter(
      (item) => (item.isBottleService ?? false) === bottleService,
    );
    const submittedIds = new Set(ids.map(String));
    if (
      matchingItems.length !== ids.length ||
      matchingItems.some((item) => !submittedIds.has(String(item._id)))
    )
      throw new Error("The menu changed. Refresh it before reordering.");

    const now = Date.now();
    await Promise.all(
      ids.map((id, index) =>
        ctx.db.patch(id, { sortOrder: index + 1, updatedAt: now }),
      ),
    );
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("menuItems") },
  handler: async (ctx, { sessionToken, id }) => {
    await requireAdmin(ctx, sessionToken);
    const item = await ctx.db.get(id);
    if (item?.imageStorageId) await ctx.storage.delete(item.imageStorageId);
    await ctx.db.delete(id);
  },
});
