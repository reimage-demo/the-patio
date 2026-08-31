export async function requireAdmin(ctx: any, token: string) {
  const session = await ctx.db.query('adminSessions').withIndex('by_token', (q: any) => q.eq('token', token)).unique()
  if (!session || session.expiresAt <= Date.now()) throw new Error('UNAUTHORIZED')
  return session
}
