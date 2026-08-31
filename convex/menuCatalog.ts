import { internalMutation, internalQuery } from "./_generated/server";

type CatalogItem = {
  name: string;
  category: string;
  description: string;
  price: number;
  bottle?: boolean;
};

const categories = [
  { name: "Signature Cocktails", kind: "menu" as const, sortOrder: 1 },
  { name: "Shots", kind: "menu" as const, sortOrder: 2 },
  { name: "Custom Drinks", kind: "menu" as const, sortOrder: 3 },
  { name: "Vodka", kind: "menu" as const, sortOrder: 4 },
  { name: "Tequila", kind: "menu" as const, sortOrder: 5 },
  { name: "Rum", kind: "menu" as const, sortOrder: 6 },
  { name: "Gin", kind: "menu" as const, sortOrder: 7 },
  { name: "Cognac", kind: "menu" as const, sortOrder: 8 },
  { name: "Whiskey", kind: "menu" as const, sortOrder: 9 },
  { name: "Other Drinks", kind: "menu" as const, sortOrder: 10 },
  { name: "Hookah", kind: "menu" as const, sortOrder: 11 },
  { name: "Bottle Service", kind: "bottle" as const, sortOrder: 1 },
  { name: "Cognac Bottles", kind: "bottle" as const, sortOrder: 2 },
  { name: "Tequila Bottles", kind: "bottle" as const, sortOrder: 3 },
  { name: "Vodka Bottles", kind: "bottle" as const, sortOrder: 4 },
];

const item = (
  name: string,
  category: string,
  price: number,
  description: string,
  bottle = false,
): CatalogItem => ({ name, category, price, description, bottle });

const catalog: CatalogItem[] = [
  item("Tropical Storm", "Signature Cocktails", 1300, "House cocktail."),
  item("The Patio", "Signature Cocktails", 1400, "House signature cocktail."),
  item(
    "Lemon Drop",
    "Signature Cocktails",
    1300,
    "Classic lemon drop cocktail.",
  ),
  item(
    "Hugo Spritz",
    "Signature Cocktails",
    1400,
    "Classic Hugo spritz cocktail.",
  ),
  item("Rum Punch", "Signature Cocktails", 1200, "House rum punch."),
  item("Mojito", "Signature Cocktails", 1300, "Classic mojito cocktail."),
  item(
    "Long Island",
    "Signature Cocktails",
    1500,
    "Classic Long Island cocktail.",
  ),
  item(
    "Non-Alcoholic Cocktail",
    "Signature Cocktails",
    1000,
    "House non-alcoholic cocktail.",
  ),

  item("Cîroc", "Vodka", 1000, "Standard vodka pour."),
  item("Cîroc Pineapple", "Vodka", 1000, "Standard flavored vodka pour."),
  item("Smirnoff", "Vodka", 1000, "Standard vodka pour."),
  item("Absolut", "Vodka", 1100, "Standard vodka pour."),
  item("Grey Goose", "Vodka", 1200, "Standard vodka pour."),
  item("Tito’s", "Vodka", 1000, "Standard vodka pour."),

  item("Patrón Silver", "Tequila", 1100, "Standard tequila pour."),
  item("Patrón Reposado", "Tequila", 1200, "Standard tequila pour."),
  item("Don Julio Blanco", "Tequila", 1100, "Standard tequila pour."),
  item("Don Julio Reposado", "Tequila", 1200, "Standard tequila pour."),
  item("Casamigos", "Tequila", 1200, "Standard tequila pour."),
  item("Casamigos Reposado", "Tequila", 1200, "Standard tequila pour."),
  item("José Cuervo", "Tequila", 1000, "Standard tequila pour."),
  item("Espolòn Reposado", "Tequila", 1100, "Standard tequila pour."),
  item("Espolòn Blanco", "Tequila", 1100, "Standard tequila pour."),
  item("1800 Blanco", "Tequila", 1000, "Standard tequila pour."),
  item("1800 Reposado", "Tequila", 1000, "Standard tequila pour."),

  item("Wray & Nephew", "Rum", 1000, "Standard rum pour."),
  item("Wray & Nephew Flask", "Rum", 3000, "Wray & Nephew flask."),
  item("Appleton 12 Year", "Rum", 1000, "Standard aged rum pour."),
  item("Appleton Signature Blend", "Rum", 1000, "Standard rum pour."),
  item("Bacardi", "Rum", 1000, "Standard rum pour."),
  item("Captain Morgan", "Rum", 1000, "Standard spiced rum pour."),
  item("Kraken Spiced Rum", "Rum", 1000, "Standard spiced rum pour."),
  item("Malibu", "Rum", 1000, "Standard coconut rum pour."),
  item("Diplomático", "Rum", 1600, "Standard premium rum pour."),

  item("Hangars", "Gin", 1000, "Standard gin pour."),
  item("Bombay", "Gin", 1000, "Standard gin pour."),

  item("Hennessy", "Cognac", 1100, "Standard cognac pour."),
  item("Hennessy VSOP", "Cognac", 1300, "Standard cognac pour."),
  item("Rémy Martin VSOP", "Cognac", 1100, "Standard cognac pour."),
  item("Rémy Martin 1738", "Cognac", 1400, "Standard cognac pour."),
  item("D’Ussé", "Cognac", 1200, "Standard cognac pour."),
  item("White Hennessy", "Cognac", 1800, "Standard cognac pour."),

  item("Woodford Reserve", "Whiskey", 1600, "Standard whiskey pour."),
  item("Johnnie Walker Black", "Whiskey", 1100, "Standard whisky pour."),

  item("Campari", "Other Drinks", 800, "Standard pour."),
  item("Stone Double", "Other Drinks", 1000, "Standard serving."),
  item("Red Bull", "Other Drinks", 500, "Single can."),
  item("Baileys", "Other Drinks", 1000, "Standard liqueur pour."),
  item("Magnum", "Other Drinks", 1500, "Standard serving."),
  item("Aperol", "Other Drinks", 1000, "Standard aperitif pour."),

  item("Hookah — 1 Hour", "Hookah", 3000, "One-hour hookah service."),
  item("Hookah Refill", "Hookah", 1000, "Standard hookah refill."),
  item("Hookah Special", "Hookah", 2000, "Hookah special."),
  item(
    "Hookah Special Refill",
    "Hookah",
    1000,
    "Refill for the hookah special.",
  ),

  item(
    "Hennessy Bottle",
    "Cognac Bottles",
    16000,
    "Full-size Hennessy bottle.",
    true,
  ),
  item(
    "Hennessy 375 ml Bottle",
    "Cognac Bottles",
    6000,
    "375 ml bottle.",
    true,
  ),
  item(
    "Rémy Martin 1738 375 ml Bottle",
    "Cognac Bottles",
    9000,
    "375 ml bottle.",
    true,
  ),
  item(
    "Don Julio 375 ml Bottle",
    "Tequila Bottles",
    8000,
    "375 ml bottle.",
    true,
  ),
  item("Tito’s 200 ml Bottle", "Vodka Bottles", 4000, "200 ml bottle.", true),
];

const normalized = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");

const aliases: Record<string, string> = {
  camperty: "camparty",
  campartry: "camparty",
  pinegingermargarita: "pineandgingermargarita",
  pineandgingermargaritas: "pineandgingermargarita",
  nonalcoholiccocktail: "nonalcoholiccocktail",
  titoshandmadevodka: "titos",
  remyvsop: "remymartinvsop",
  remy1738: "remymartin1738",
  espolone: "espolonblanco",
  casadorepo: "casamigosreposado",
  donjuliorepo: "donjulioreposado",
  patronrepo: "patronreposado",
  johnnywalkerblack: "johnniewalkerblack",
};

const identity = (value: string) => {
  const key = normalized(value);
  return aliases[key] || key;
};

export const addMissingClientMenu = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existingCategories = await ctx.db.query("menuCategories").collect();
    const existingItems = await ctx.db.query("menuItems").collect();
    let categoriesInserted = 0;
    let itemsInserted = 0;

    const knownCategories = new Set(
      existingCategories.map(
        (category) => `${category.kind}:${category.name.toLocaleLowerCase()}`,
      ),
    );
    const nextCategoryOrder = {
      menu: Math.max(
        0,
        ...existingCategories
          .filter((category) => category.kind === "menu")
          .map((category) => category.sortOrder),
      ),
      bottle: Math.max(
        0,
        ...existingCategories
          .filter((category) => category.kind === "bottle")
          .map((category) => category.sortOrder),
      ),
    };
    for (const category of categories) {
      const key = `${category.kind}:${category.name.toLocaleLowerCase()}`;
      if (knownCategories.has(key)) continue;
      const sortOrder = existingCategories.length
        ? ++nextCategoryOrder[category.kind]
        : category.sortOrder;
      await ctx.db.insert("menuCategories", {
        name: category.name,
        kind: category.kind,
        sortOrder,
        isAvailable: true,
        createdAt: now,
        updatedAt: now,
      });
      knownCategories.add(key);
      nextCategoryOrder[category.kind] = Math.max(
        nextCategoryOrder[category.kind],
        sortOrder,
      );
      categoriesInserted++;
    }
    for (const existingItem of existingItems) {
      const categoryKind = existingItem.isBottleService ? "bottle" : "menu";
      const key = `${categoryKind}:${existingItem.category.toLocaleLowerCase()}`;
      if (knownCategories.has(key)) continue;
      await ctx.db.insert("menuCategories", {
        name: existingItem.category,
        kind: categoryKind,
        isAvailable: true,
        sortOrder: ++nextCategoryOrder[categoryKind],
        createdAt: now,
        updatedAt: now,
      });
      knownCategories.add(key);
      categoriesInserted++;
    }

    const knownItems = new Set(
      existingItems.map((entry) => identity(entry.name)),
    );
    let regularSort = Math.max(
      0,
      ...existingItems
        .filter((entry) => !entry.isBottleService)
        .map((entry) => entry.sortOrder),
    );
    let bottleSort = Math.max(
      0,
      ...existingItems
        .filter((entry) => entry.isBottleService)
        .map((entry) => entry.sortOrder),
    );
    const skipped: string[] = [];
    const inserted: string[] = [];
    for (const entry of catalog) {
      const key = identity(entry.name);
      if (knownItems.has(key)) {
        skipped.push(entry.name);
        continue;
      }
      const sortOrder = entry.bottle ? ++bottleSort : ++regularSort;
      await ctx.db.insert("menuItems", {
        name: entry.name,
        category: entry.category,
        description: entry.description,
        price: entry.price,
        isAvailable: true,
        isFeatured: false,
        isDrinkOfNight: false,
        isCustomDrink: false,
        isBottleService: entry.bottle ?? false,
        showsStartingPrice: false,
        optionGroupIds: [],
        sortOrder,
        addOns: [],
        createdAt: now,
        updatedAt: now,
      });
      knownItems.add(key);
      itemsInserted++;
      inserted.push(entry.name);
    }
    return {
      categoriesInserted,
      itemsInserted,
      inserted,
      skipped,
      existingItemsPreserved: existingItems.length,
    };
  },
});

type SectionType =
  | "spirit"
  | "beverage"
  | "specialty"
  | "bottle-service"
  | "service";
type ItemType =
  | "cocktail"
  | "pour"
  | "shot"
  | "flask"
  | "bottle"
  | "package"
  | "wine"
  | "beer"
  | "non-alcoholic"
  | "hookah"
  | "custom";

const spiritFirstSections: Array<{
  name: string;
  kind: "menu" | "bottle";
  sectionType: SectionType;
  description: string;
}> = [
  {
    name: "Build Your Own",
    kind: "menu",
    sectionType: "specialty",
    description: "Choose your spirit, mixer and extras.",
  },
  {
    name: "Vodka",
    kind: "menu",
    sectionType: "spirit",
    description: "Vodka cocktails and pours.",
  },
  {
    name: "Tequila",
    kind: "menu",
    sectionType: "spirit",
    description: "Tequila cocktails and pours.",
  },
  {
    name: "Rum",
    kind: "menu",
    sectionType: "spirit",
    description: "Rum cocktails, pours and flasks.",
  },
  {
    name: "Gin",
    kind: "menu",
    sectionType: "spirit",
    description: "Gin cocktails and pours.",
  },
  {
    name: "Whiskey & Bourbon",
    kind: "menu",
    sectionType: "spirit",
    description: "Whiskey and bourbon cocktails, shots and pours.",
  },
  {
    name: "Cognac",
    kind: "menu",
    sectionType: "spirit",
    description: "Cognac cocktails and pours.",
  },
  {
    name: "Aperitifs, Spritzes & Liqueurs",
    kind: "menu",
    sectionType: "specialty",
    description: "Spritzes, aperitifs and liqueur pours.",
  },
  {
    name: "House Specialties",
    kind: "menu",
    sectionType: "specialty",
    description: "Signature Patio creations.",
  },
  {
    name: "Wine & Tonic Wine",
    kind: "menu",
    sectionType: "beverage",
    description: "Wine and fortified tonic wine.",
  },
  {
    name: "Beer",
    kind: "menu",
    sectionType: "beverage",
    description: "Beer selections.",
  },
  {
    name: "Non-Alcoholic",
    kind: "menu",
    sectionType: "beverage",
    description: "Alcohol-free drinks and refreshments.",
  },
  {
    name: "Bottle Service",
    kind: "bottle",
    sectionType: "bottle-service",
    description: "Choose a bottle or customize a bottle-service package.",
  },
  {
    name: "Hookah",
    kind: "menu",
    sectionType: "service",
    description: "Hookah sessions and refills.",
  },
];

const assigned = (
  section: string,
  itemType: ItemType,
  names: string[],
) => names.map((name) => ({ name, section, itemType }));

const spiritFirstAssignments = [
  ...assigned("Build Your Own", "custom", ["Build Your Own Drink"]),
  ...assigned("Vodka", "cocktail", [
    "Pineapple Lemon Drop",
    "The Blue Lagoon",
    "Lemon Drop",
    "Long Island",
  ]),
  ...assigned("Vodka", "pour", [
    "Cîroc",
    "Cîroc Pineapple",
    "Smirnoff",
    "Absolut",
    "Grey Goose",
    "Tito’s",
  ]),
  ...assigned("Tequila", "cocktail", [
    "Pine and Ginger Margarita",
    "Lychee Margarita",
  ]),
  ...assigned("Tequila", "pour", [
    "Patrón Silver",
    "Patrón Reposado",
    "Don Julio Blanco",
    "Don Julio Reposado",
    "Casamigos",
    "Casamigos Reposado",
    "José Cuervo",
    "Espolòn Reposado",
    "Espolòn Blanco",
    "1800 Blanco",
    "1800 Reposado",
  ]),
  ...assigned("Rum", "cocktail", ["Tropical Storm", "Rum Punch", "Mojito"]),
  ...assigned("Rum", "pour", [
    "Wray & Nephew",
    "Appleton 12 Year",
    "Appleton Signature Blend",
    "Bacardi",
    "Captain Morgan",
    "Kraken Spiced Rum",
    "Malibu",
    "Diplomático",
  ]),
  ...assigned("Rum", "flask", ["Wray & Nephew Flask"]),
  ...assigned("Gin", "cocktail", ["Campar-ty", "Cool Oasis", "Lychee Bliss"]),
  ...assigned("Gin", "pour", ["Hangars", "Bombay"]),
  ...assigned("Whiskey & Bourbon", "cocktail", [
    "Mi Old Fashion",
    "Whisky Sour",
    "Island Roots",
  ]),
  ...assigned("Whiskey & Bourbon", "shot", ["Greentea Shot"]),
  ...assigned("Whiskey & Bourbon", "pour", [
    "Woodford Reserve",
    "Johnnie Walker Black",
  ]),
  ...assigned("Cognac", "cocktail", ["Henny Punch"]),
  ...assigned("Cognac", "pour", [
    "Hennessy",
    "Hennessy VSOP",
    "Rémy Martin VSOP",
    "Rémy Martin 1738",
    "D’Ussé",
    "White Hennessy",
  ]),
  ...assigned("Aperitifs, Spritzes & Liqueurs", "cocktail", ["Hugo Spritz"]),
  ...assigned("Aperitifs, Spritzes & Liqueurs", "pour", [
    "Campari",
    "Baileys",
    "Aperol",
  ]),
  ...assigned("House Specialties", "cocktail", ["The Patio"]),
  ...assigned("Wine & Tonic Wine", "wine", ["Magnum"]),
  ...assigned("Beer", "beer", ["Stone Double"]),
  ...assigned("Non-Alcoholic", "non-alcoholic", [
    "Non-Alcoholic Cocktail",
    "Red Bull",
  ]),
  ...assigned("Bottle Service", "package", [
    "The Patio VIP Bottle Experience",
  ]),
  ...assigned("Bottle Service", "bottle", [
    "Hennessy Bottle",
    "Hennessy 375 ml Bottle",
    "Rémy Martin 1738 375 ml Bottle",
    "Don Julio 375 ml Bottle",
    "Tito’s 200 ml Bottle",
  ]),
  ...assigned("Hookah", "hookah", [
    "Hookah — 1 Hour",
    "Hookah Refill",
    "Hookah Special",
    "Hookah Special Refill",
  ]),
];

const sectionSlug = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function assignmentMap() {
  const result = new Map<
    string,
    { name: string; section: string; itemType: ItemType }
  >();
  for (const entry of spiritFirstAssignments) {
    const key = identity(entry.name);
    if (result.has(key)) throw new Error(`Duplicate assignment: ${entry.name}`);
    result.set(key, entry);
  }
  return result;
}

export const organizeSpiritFirst = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const items = await ctx.db.query("menuItems").collect();
    const visibleItems = items.filter((entry) => entry.isAvailable);
    const hiddenItems = items.filter((entry) => !entry.isAvailable);
    const expected = assignmentMap();
    const liveByIdentity = new Map(
      visibleItems.map((entry) => [identity(entry.name), entry]),
    );
    const missing = [...expected.entries()]
      .filter(([key]) => !liveByIdentity.has(key))
      .map(([, entry]) => entry.name);
    const unexpected = visibleItems
      .filter((entry) => !expected.has(identity(entry.name)))
      .map((entry) => entry.name);
    const unexpectedHidden = hiddenItems
      .filter((entry) => entry.name !== "TEST")
      .map((entry) => entry.name);
    if (
      visibleItems.length !== spiritFirstAssignments.length ||
      missing.length ||
      unexpected.length ||
      unexpectedHidden.length
    )
      throw new Error(
        JSON.stringify({
          reason: "The live catalog changed; no migration was applied.",
          expectedVisible: spiritFirstAssignments.length,
          actualVisible: visibleItems.length,
          missing,
          unexpected,
          unexpectedHidden,
        }),
      );

    const categories = await ctx.db.query("menuCategories").collect();
    const sectionIds = new Map<string, any>();
    for (const [index, definition] of spiritFirstSections.entries()) {
      const existing = categories.find(
        (category) =>
          category.kind === definition.kind &&
          category.name.toLocaleLowerCase() ===
            definition.name.toLocaleLowerCase(),
      );
      const values = {
        name: definition.name,
        kind: definition.kind,
        slug: sectionSlug(definition.name),
        description: definition.description,
        sectionType: definition.sectionType,
        isAvailable: true,
        sortOrder: index + 1,
        updatedAt: now,
      };
      if (existing) {
        await ctx.db.patch(existing._id, values);
        sectionIds.set(definition.name, existing._id);
      } else {
        const id = await ctx.db.insert("menuCategories", {
          ...values,
          createdAt: now,
        });
        sectionIds.set(definition.name, id);
      }
    }

    const priceChecksumBefore = visibleItems.reduce(
      (sum, entry) => sum + entry.price,
      0,
    );
    for (const item of visibleItems) {
      const destination = expected.get(identity(item.name));
      if (!destination) throw new Error(`No assignment for ${item.name}.`);
      const sectionId = sectionIds.get(destination.section);
      if (!sectionId)
        throw new Error(`No public section named ${destination.section}.`);
      await ctx.db.patch(item._id, {
        sectionId,
        category: destination.section,
        itemType: destination.itemType,
        updatedAt: now,
      });
    }
    for (const item of hiddenItems.filter((entry) => entry.name === "TEST")) {
      await ctx.db.patch(item._id, {
        sectionId: undefined,
        itemType: undefined,
        updatedAt: now,
      });
    }

    const retainedSectionIds = new Set(
      [...sectionIds.values()].map((id) => String(id)),
    );
    let oldSectionsRemoved = 0;
    for (const category of categories) {
      if (retainedSectionIds.has(String(category._id))) continue;
      await ctx.db.delete(category._id);
      oldSectionsRemoved++;
    }

    return {
      visibleItemsAssigned: visibleItems.length,
      hiddenTestItems: hiddenItems.filter((entry) => entry.name === "TEST")
        .length,
      sections: spiritFirstSections.length,
      oldSectionsRemoved,
      priceChecksumBefore,
      itemIdsPreserved: visibleItems.map((entry) => entry._id),
    };
  },
});

export const verifySpiritFirst = internalQuery({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("menuItems").collect();
    const categories = await ctx.db.query("menuCategories").collect();
    const categoryById = new Map(
      categories.map((category) => [String(category._id), category]),
    );
    const expected = assignmentMap();
    const visibleItems = items.filter((entry) => entry.isAvailable);
    const errors: string[] = [];
    for (const item of visibleItems) {
      const assignment = expected.get(identity(item.name));
      const section = item.sectionId
        ? categoryById.get(String(item.sectionId))
        : undefined;
      if (!assignment) errors.push(`${item.name}: unexpected visible item`);
      else if (!section)
        errors.push(`${item.name}: missing public section reference`);
      else if (section.name !== assignment.section)
        errors.push(`${item.name}: expected ${assignment.section}, got ${section.name}`);
      else if (item.itemType !== assignment.itemType)
        errors.push(`${item.name}: expected type ${assignment.itemType}`);
    }
    const sectionNames = categories
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((section) => section.name);
    const expectedSectionNames = spiritFirstSections.map((section) => section.name);
    if (JSON.stringify(sectionNames) !== JSON.stringify(expectedSectionNames))
      errors.push("Public section names or order do not match the plan.");
    const hiddenTest = items.find(
      (entry) => entry.name === "TEST" && !entry.isAvailable,
    );
    if (hiddenTest?.sectionId)
      errors.push("The hidden TEST item is assigned to a public section.");
    return {
      ok: errors.length === 0,
      errors,
      visibleItems: visibleItems.length,
      sections: categories.length,
      priceChecksum: visibleItems.reduce((sum, entry) => sum + entry.price, 0),
      hiddenTestUnpublished: Boolean(hiddenTest && !hiddenTest.sectionId),
    };
  },
});
