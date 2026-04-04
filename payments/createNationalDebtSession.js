const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createNationalDebtSession({
  discordUserId,
  discordTag,
  guildId,
  guildName,
  totalSapphires,
  usdAmount,
}) {
  if (!process.env.STRIPE_NATIONAL_DEBT_PRICE_ID) {
    throw new Error('Missing STRIPE_NATIONAL_DEBT_PRICE_ID in environment variables.');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price: process.env.STRIPE_NATIONAL_DEBT_PRICE_ID,
        quantity: 1,
      },
    ],
    client_reference_id: discordUserId,
    metadata: {
      discordUserId,
      discordTag: discordTag ?? '',
      guildId: guildId ?? '',
      guildName: guildName ?? '',
      sourceCommand: 'admin nationaldebt',
      totalSapphires: String(totalSapphires),
      suggestedAmountUsd: usdAmount.toFixed(2),
    },
    success_url: 'https://stripe.com',
    cancel_url: 'https://stripe.com',
  });

  return session;
}

module.exports = { createNationalDebtSession };