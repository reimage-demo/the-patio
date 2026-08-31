import { internalMutation, mutation } from './_generated/server'
import type { Id } from './_generated/dataModel'

const menu = [
  ['Passion Fruit Margarita','House Favorites','Tequila blanco, passion fruit, fresh lime and agave with a citrus-salt rim.',1500,'Tropical'],['Main Street Mule','House Favorites','Vodka, fresh lime, ginger beer and aromatic bitters.',1300,'Zesty'],['Pretty in Pink','Bright & Floral','Tequila blanco, prickly pear, lemon and sparkling rosé.',1500,'Floral'],['Garden After Dark','Bright & Floral','Gin, cucumber, basil, elderflower and tonic.',1400,'Fresh'],['The Birdie','Playful Sips','Bourbon, peach, lemon, mint and a splash of soda.',1500,'Smooth'],['Hole in One','Playful Sips','Reposado tequila, orange, pineapple and jalapeño agave.',1600,'Spicy'],['Golden Hour Spritz','Bubbles','Aperol, passion fruit, prosecco and sparkling water.',1400,'Bubbly'],['Laugh Often Lemon Drop','Bubbles','Citrus vodka, limoncello, lemon and a sugared rim.',1300,'Citrus'],['Green Wall Mojito','Fresh Classics','White rum, mint, lime, cane sugar and soda.',1300,'Cool'],['Hartford Espresso','Fresh Classics','Vodka, coffee liqueur, cold brew and vanilla.',1500,'Late Night'],['Pineapple Heaven','Tropical Favorites','Coconut rum, pineapple juice, fresh lime and a splash of orange.',1400,'Tropical'],['Hennessy with Coke','Classic Pours','Hennessy cognac served over ice with Coca-Cola and a fresh lime wedge.',1600,'Classic']
] as const

export const run = mutation({ args: {}, handler: async ctx => {
  const now = Date.now(); let menuInserted = 0; let eventsInserted = 0
  if (!(await ctx.db.query('menuItems').first())) for (const [index,row] of menu.entries()) { await ctx.db.insert('menuItems',{name:row[0],category:row[1],description:row[2],price:row[3],accent:row[4],isAvailable:true,sortOrder:index+1,addOns:[{name:'Make it a double',price:500,isAvailable:true}],createdAt:now,updatedAt:now}); menuInserted++ }
  if (!(await ctx.db.query('events').first())) { const events = [
    {title:'Patio Sessions: Live R&B',date:'2026-07-18',startTime:'8:00 PM',endTime:'11:00 PM',description:'A warm summer night of live R&B, cocktails and easy conversation under the lights.',imageUrl:'assets/images/patio-lounge.jpg'},
    {title:'Sip & Putt Social',date:'2026-07-25',startTime:'6:00 PM',endTime:'10:00 PM',description:'Bring your crew for mini golf, house cocktails and a laid-back DJ set.',imageUrl:'assets/images/mini-golf.jpg'},
    {title:'Sunday Garden Brunch',date:'2026-08-02',startTime:'11:00 AM',endTime:'3:00 PM',description:'Brunch energy, bright drinks and feel-good music in Hartford’s hidden garden.',imageUrl:'assets/images/patio-pink.jpg'}
  ]; for (const event of events) { await ctx.db.insert('events',{...event,isPublished:true,createdAt:now,updatedAt:now}); eventsInserted++ } }
  return { menuInserted, eventsInserted }
} })

export const setPlaceholderEvent = mutation({ args: {}, handler: async ctx => {
  const rows = await ctx.db.query('events').collect()
  for (const row of rows) await ctx.db.delete(row._id)
  const now = Date.now()
  await ctx.db.insert('events', {
    title: 'Live Music Night', date: '2026-08-01', startTime: '8:00 PM', endTime: '11:00 PM',
    description: 'A placeholder event featuring live music, cocktails and an intimate Patio atmosphere. Full artist details coming soon.',
    imageUrl: 'assets/images/patio-lounge.jpg', isPublished: true, createdAt: now, updatedAt: now
  })
  return { deleted: rows.length, inserted: 1 }
} })

export const setPassionFruitMargarita = mutation({ args: {}, handler: async ctx => {
  const rows = await ctx.db.query('menuItems').withIndex('by_sort_order').collect()
  const first = rows.find(row => row.sortOrder === 1) || rows[0]
  if (!first) return { updated: 0 }
  await ctx.db.patch(first._id, {
    name: 'Passion Fruit Margarita', category: 'House Favorites',
    description: 'Tequila blanco, passion fruit, fresh lime and agave with a citrus-salt rim.',
    price: 1500, accent: 'Tropical', updatedAt: Date.now()
  })
  return { updated: 1 }
} })

export const addExtraDrinks = mutation({ args: {}, handler: async ctx => {
  const existing = await ctx.db.query('menuItems').collect()
  const now = Date.now()
  const additions = [
    { name: 'Pineapple Heaven', category: 'Tropical Favorites', description: 'Coconut rum, pineapple juice, fresh lime and a splash of orange.', price: 1400, accent: 'Tropical', sortOrder: 11 },
    { name: 'Hennessy with Coke', category: 'Classic Pours', description: 'Hennessy cognac served over ice with Coca-Cola and a fresh lime wedge.', price: 1600, accent: 'Classic', sortOrder: 12 }
  ]
  let inserted = 0
  for (const drink of additions) {
    if (existing.some(item => item.name.toLowerCase() === drink.name.toLowerCase())) continue
    await ctx.db.insert('menuItems', { ...drink, isAvailable: true, addOns: [{ name: 'Make it a double', price: 500, isAvailable: true }], createdAt: now, updatedAt: now })
    inserted++
  }
  return { inserted }
} })

export const addBottleServiceDemo = internalMutation({ args: {}, handler: async ctx => {
  const now = Date.now()
  const existingItems = await ctx.db.query('menuItems').collect()
  const existingGroups = await ctx.db.query('optionGroups').collect()
  const groupDefinitions = [
    {
      name: 'Choose your bottle',
      description: 'One premium 750 ml bottle is included.',
      selectionMode: 'single' as const,
      minSelections: 1,
      maxSelections: 1,
      options: [
        ['titos', "Tito’s Handmade Vodka", '750 ml', 0],
        ['casamigos', 'Casamigos Blanco', '750 ml', 7500],
        ['hennessy', 'Hennessy VS', '750 ml', 10000],
        ['patron', 'Patrón Silver', '750 ml', 12500],
      ],
    },
    {
      name: 'Choose included drinks',
      description: 'Choose up to two included drink bundles.',
      selectionMode: 'multiple' as const,
      minSelections: 1,
      maxSelections: 2,
      options: [
        ['water', 'Bottled water', 'Six bottles', 0],
        ['soda', 'Assorted soda', 'Six cans', 0],
        ['red-bull', 'Red Bull', 'Four cans', 2000],
        ['ginger-beer', 'Ginger beer', 'Six bottles', 1000],
      ],
    },
    {
      name: 'Choose your chasers',
      description: 'Choose up to two carafes.',
      selectionMode: 'multiple' as const,
      minSelections: 0,
      maxSelections: 2,
      options: [
        ['cranberry', 'Cranberry juice', 'One carafe', 0],
        ['pineapple', 'Pineapple juice', 'One carafe', 0],
        ['orange', 'Orange juice', 'One carafe', 0],
        ['cola', 'Cola', 'One carafe', 0],
      ],
    },
  ]

  const optionGroupIds: Id<'optionGroups'>[] = []
  let groupsInserted = 0
  for (const [groupIndex, definition] of groupDefinitions.entries()) {
    const existing = existingGroups.find(group => group.name === definition.name)
    if (existing) {
      optionGroupIds.push(existing._id)
      continue
    }
    const id = await ctx.db.insert('optionGroups', {
      ...definition,
      isAvailable: true,
      sortOrder: 100 + groupIndex,
      options: definition.options.map(([id, name, description, price], index) => ({
        id: String(id),
        name: String(name),
        description: String(description),
        price: Number(price),
        isAvailable: true,
        sortOrder: index + 1,
      })),
      createdAt: now,
      updatedAt: now,
    })
    optionGroupIds.push(id)
    groupsInserted++
  }

  const existingPackage = existingItems.find(item => item.name === 'The Patio VIP Bottle Experience')
  if (existingPackage) {
    await ctx.db.patch(existingPackage._id, {
      isBottleService: true,
      isCustomDrink: true,
      isAvailable: true,
      imageUrl: '/assets/images/patio-lounge-2.jpg',
      optionGroupIds,
      updatedAt: now,
    })
    return { packageId: existingPackage._id, packageInserted: 0, groupsInserted }
  }
  const packageId = await ctx.db.insert('menuItems', {
    name: 'The Patio VIP Bottle Experience',
    category: 'Bottle Service',
    description: 'A premium bottle presentation for your table with included drinks and your choice of chasers.',
    price: 27500,
    accent: 'VIP',
    imageUrl: '/assets/images/patio-lounge-2.jpg',
    isAvailable: true,
    isFeatured: false,
    isDrinkOfNight: false,
    isCustomDrink: true,
    isBottleService: true,
    optionGroupIds,
    sortOrder: 1,
    addOns: [],
    createdAt: now,
    updatedAt: now,
  })
  return { packageId, packageInserted: 1, groupsInserted }
} })
