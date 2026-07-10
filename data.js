(function () {
const fallbackMenu = [
  { _id: 'm1', name: 'Passion Fruit Margarita', category: 'House Favorites', description: 'Tequila blanco, passion fruit, fresh lime and agave with a citrus-salt rim.', price: 1500, accent: 'Tropical', isAvailable: true },
  { _id: 'm2', name: 'Main Street Mule', category: 'House Favorites', description: 'Vodka, fresh lime, ginger beer and aromatic bitters.', price: 1300, accent: 'Zesty', isAvailable: true },
  { _id: 'm3', name: 'Pretty in Pink', category: 'Bright & Floral', description: 'Tequila blanco, prickly pear, lemon and sparkling rosé.', price: 1500, accent: 'Floral', isAvailable: true },
  { _id: 'm4', name: 'Garden After Dark', category: 'Bright & Floral', description: 'Gin, cucumber, basil, elderflower and tonic.', price: 1400, accent: 'Fresh', isAvailable: true },
  { _id: 'm5', name: 'The Birdie', category: 'Playful Sips', description: 'Bourbon, peach, lemon, mint and a splash of soda.', price: 1500, accent: 'Smooth', isAvailable: true },
  { _id: 'm6', name: 'Hole in One', category: 'Playful Sips', description: 'Reposado tequila, orange, pineapple and jalapeño agave.', price: 1600, accent: 'Spicy', isAvailable: true },
  { _id: 'm7', name: 'Golden Hour Spritz', category: 'Bubbles', description: 'Aperol, passion fruit, prosecco and sparkling water.', price: 1400, accent: 'Bubbly', isAvailable: true },
  { _id: 'm8', name: 'Laugh Often Lemon Drop', category: 'Bubbles', description: 'Citrus vodka, limoncello, lemon and a sugared rim.', price: 1300, accent: 'Citrus', isAvailable: true },
  { _id: 'm9', name: 'Green Wall Mojito', category: 'Fresh Classics', description: 'White rum, mint, lime, cane sugar and soda.', price: 1300, accent: 'Cool', isAvailable: true },
  { _id: 'm10', name: 'Hartford Espresso', category: 'Fresh Classics', description: 'Vodka, coffee liqueur, cold brew and vanilla.', price: 1500, accent: 'Late Night', isAvailable: true },
  { _id: 'm11', name: 'Pineapple Heaven', category: 'Tropical Favorites', description: 'Coconut rum, pineapple juice, fresh lime and a splash of orange.', price: 1400, accent: 'Tropical', isAvailable: true },
  { _id: 'm12', name: 'Hennessy with Coke', category: 'Classic Pours', description: 'Hennessy cognac served over ice with Coca-Cola and a fresh lime wedge.', price: 1600, accent: 'Classic', isAvailable: true }
]

const fallbackEvents = [
  { _id: 'e1', title: 'Live Music Night', date: '2026-08-01', startTime: '8:00 PM', endTime: '11:00 PM', description: 'A placeholder event featuring live music, cocktails and an intimate Patio atmosphere. Full artist details coming soon.', imageUrl: 'assets/images/patio-lounge.jpg', isPublished: true }
]

window.PatioData = { fallbackMenu, fallbackEvents }
})()
