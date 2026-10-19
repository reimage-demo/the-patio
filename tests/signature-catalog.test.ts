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

test('admin photo and size-price edits reach the public catalog and checkout', async () => {
  const { t, id, sizeId } = await setup();
  const sessionToken = 'test-admin-session';
  await t.run(ctx => ctx.db.insert('adminSessions', {
    token: sessionToken, username: 'Test admin', createdAt: Date.now(), expiresAt: Date.now() + 60_000,
  }));
  const rows = await t.query(api.menuItems.adminList, { sessionToken });
  const item = rows.find(row => row._id === id)!;
  expect(item.imageUrl).toContain('bucket-rum-punch.webp');
  const uploadedPhoto = await t.run(ctx => ctx.storage.store(new Blob(['test photo'], { type: 'image/webp' })));
  const { _id, _creationTime, createdAt, updatedAt, imageUrl, ...editable } = item;
  await t.mutation(api.menuItems.update, { sessionToken, id, ...editable, price: 1700, imageStorageId: uploadedPhoto });
  const groups = await t.query(api.optionGroups.adminList, { sessionToken });
  const { _id: groupId, _creationTime: groupCreationTime, createdAt: groupCreatedAt, updatedAt: groupUpdatedAt, ...group } = groups.find(row => row._id === sizeId)!;
  await t.mutation(api.optionGroups.update, {
    sessionToken, id: groupId, ...group,
    options: group.options.map(option => ({ ...option, price: option.id === 'large' ? 1200 : 0 })),
  });
  const catalog = await t.query(api.menuItems.listPublicCatalog, {});
  const updated = catalog.sections[0].items[0];
  const adminItem = (await t.query(api.menuItems.adminList, { sessionToken })).find(row => row._id === id)!;
  expect(updated.price).toBe(1700);
  expect(updated.imageUrl).toBe(adminItem.imageUrl);
  expect(updated.imageUrl).toBeTruthy();
  expect(updated.imageUrl).not.toBe(imageUrl);
  expect(adminItem.imageStorageId).toBe(uploadedPhoto);
  expect(updated.optionGroups[0].options.map(option => updated.price + option.price)).toEqual([1700, 2900]);
  await expect(t.mutation(internal.signatureDrink.useRetouchedPhoto, {})).rejects.toThrow('photo was changed in admin');
  const result = await t.mutation(internal.clover.prepareHostedCheckout, {
    clientRequestId: crypto.randomUUID(), candidateIdempotencyKey: crypto.randomUUID(), customerName: 'Test Guest',
    phone: '8605550100', email: 'test@example.com', ageConfirmed: true, notes: '', tip: 0,
    items: [{ menuItemId: id, quantity: 1, selectedOptions: [{ groupId, optionId: 'large' }] }],
  });
  const order = await t.run(ctx => ctx.db.get(result.orderId as any));
  expect((order as any).subtotal).toBe(2900);
});
