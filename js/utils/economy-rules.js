// Pure Study Credit ledger & atomic shop rule evaluators

export function computeWalletFromLedger(ledger = []) {
  let balance = 0;
  let earned = 0;
  let spent = 0;
  for (const tx of ledger) {
    const amount = Number(tx.amount) || 0;
    balance += amount;
    if (amount > 0) earned += amount;
    if (amount < 0) spent += Math.abs(amount);
  }
  return {
    balance: Math.max(0, balance),
    earned,
    spent
  };
}

export function validateItemPurchase({
  item,
  ledger = [],
  ownedIds = [],
  isPremium = false
}) {
  if (!item || !item.id) {
    return { ok: false, reason: "invalid_item", message: "Item does not exist." };
  }
  if (ownedIds.includes(item.id)) {
    return { ok: false, reason: "already_owned", message: "You already own this item." };
  }
  if (item.premiumOnly && !isPremium) {
    return { ok: false, reason: "premium_required", message: "Requires Premium membership." };
  }
  const price = Math.max(0, Number(item.price) || 0);
  const wallet = computeWalletFromLedger(ledger);
  if (wallet.balance < price) {
    return {
      ok: false,
      reason: "insufficient_funds",
      message: `Need ${price - wallet.balance} more Study Credits.`
    };
  }
  return { ok: true, price, remainingBalance: wallet.balance - price };
}

export function appendLedgerTransaction(ledger = [], tx) {
  if (!tx || !tx.idempotencyKey) {
    throw new Error("Transaction requires an idempotencyKey.");
  }
  if (ledger.some((existing) => existing.idempotencyKey === tx.idempotencyKey)) {
    return { appended: false, ledger };
  }
  const next = [
    {
      id: tx.id || tx.idempotencyKey,
      idempotencyKey: tx.idempotencyKey,
      type: tx.type,
      amount: Number(tx.amount) || 0,
      description: tx.description || "",
      referenceId: tx.referenceId || null,
      createdAt: tx.createdAt || new Date().toISOString()
    },
    ...ledger
  ];
  return { appended: true, ledger: next };
}
