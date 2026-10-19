import { internalMutation } from "./_generated/server";

// Targeted, idempotent catalog addition. Existing drinks and prices stay intact.
export const addBucketRumPunch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = (await ctx.db.query("menuItems").collect()).find(
      (item) => item.name.toLowerCase() === "bucket rum punch",
    );
    if (existing) return { id: existing._id, created: false };
    const rum = (await ctx.db.query("menuCategories").collect()).find(
      (section) => section.name.toLowerCase() === "rum" && section.kind === "menu",
    );
    if (!rum?.isAvailable) throw new Error("The Rum section must be available.");
    const now = Date.now();
    const sizeId = await ctx.db.insert("optionGroups", {
      name: "Size",
      description: "Choose your Bucket Rum Punch size.",
      selectionMode: "single",
      minSelections: 1,
      maxSelections: 1,
      isAvailable: true,
      sortOrder: 1,
      options: [
        { id: "small", name: "Small", description: "", price: 0, isAvailable: true, sortOrder: 1 },
        { id: "large", name: "Large", description: "", price: 1000, isAvailable: true, sortOrder: 2 },
      ],
      createdAt: now,
      updatedAt: now,
    });
    const id = await ctx.db.insert("menuItems", {
      name: "Bucket Rum Punch",
      category: rum.name,
      sectionId: rum._id,
      itemType: "cocktail",
      description: "The Patio’s signature rum punch, served by the bucket. Choose Small or Large.",
      price: 1500,
      imageUrl: "https://thepatioct.com/assets/images/bucket-rum-punch.webp",
      isAvailable: true,
      isFeatured: true,
      showsStartingPrice: true,
      isBottleService: false,
      optionGroupIds: [sizeId],
      sortOrder: 0,
      addOns: [],
      createdAt: now,
      updatedAt: now,
    });
    return { id, sizeId, created: true };
  },
});
