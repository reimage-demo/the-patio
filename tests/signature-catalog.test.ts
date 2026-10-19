import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from '../convex/schema';
import { api, internal } from '../convex/_generated/api';
const modules = import.meta.glob('../convex/**/*.{ts,js}');
async function setup() {
  const t = convexTest(schema, modules);
  await t.run(ctx => ctx.db.insert('menuCategories', { name: 'Rum', kind: 'menu', isAvailable: true, sortOrder: 1, createdAt: 1, updatedAt: 1 }));
  const result = await t.mutation(internal.signatureDrink.addBucketRumPunch, {});
  return { t, ...result };
}
test('catalog addition is idempotent, visible in Rum, and uses the supplied photo', async () => {
  const { t, id } = await setup();
  expect(await t.mutation(internal.signatureDrink.addBucketRumPunch, {})).toEqual({ id, created: false });
  const catalog = await t.query(api.menuItems.listPublicCatalog, {});
  expect(catalog.sections[0].name).toBe('Rum');
  expect(catalog.sections[0].items).toHaveLength(1);
  expect(catalog.sections[0].items[0]).toMatchObject({ name: 'Bucket Rum Punch', price: 1500, imageUrl: 'https://thepatioct.com/assets/images/bucket-rum-punch.webp' });
  const groups = await t.run(ctx => ctx.db.query('optionGroups').collect());
  expect(groups).toHaveLength(1);
});
test('server rejects missing or multiple sizes and prices each chosen size', async () => {
  const { t, id, sizeId } = await setup();
  const prepare = (options: string[]) => t.mutation(internal.clover.prepareHostedCheckout, {
    clientRequestId: crypto.randomUUID(), candidateIdempotencyKey: crypto.randomUUID(), customerName: 'Test Guest', phone: '8605550100', email: 'test@example.com', ageConfirmed: true, notes: '', tip: 0,
    items: [{ menuItemId: id, quantity: 1, selectedOptions: options.map(optionId => ({ groupId: sizeId!, optionId })) }],
  });
  await expect(prepare([])).rejects.toThrow('Please complete Size');
  await expect(prepare(['small','large'])).rejects.toThrow('Please complete Size');
  await expect(prepare(['invalid'])).rejects.toThrow('no longer available');
  for (const [size, price] of [['small',1500],['large',2500]] as const) {
    const result = await prepare([size]);
    const order = await t.run(ctx => ctx.db.get(result.orderId as any));
    expect((order as any).subtotal).toBe(price);
    expect((order as any).items[0].selectedAddOns[0].name).toBe(`Size: ${size === 'small' ? 'Small' : 'Large'}`);
  }
});
