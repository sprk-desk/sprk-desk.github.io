import test from "node:test";
import assert from "node:assert/strict";
import {
  computeWalletFromLedger,
  validateItemPurchase,
  appendLedgerTransaction
} from "./economy-rules.js";

test("wallet balance derives accurately from immutable ledger", () => {
  const ledger = [
    { idempotencyKey: "k1", type: "focus_reward", amount: 25 },
    { idempotencyKey: "k2", type: "purchase", amount: -10 },
    { idempotencyKey: "k3", type: "daily_bonus", amount: 15 }
  ];
  const wallet = computeWalletFromLedger(ledger);
  assert.equal(wallet.balance, 30);
  assert.equal(wallet.earned, 40);
  assert.equal(wallet.spent, 10);
});

test("appendLedgerTransaction enforces idempotency", () => {
  const initial = [];
  const first = appendLedgerTransaction(initial, {
    idempotencyKey: "sess_1",
    type: "focus_reward",
    amount: 10
  });
  assert.equal(first.appended, true);
  assert.equal(first.ledger.length, 1);

  const duplicate = appendLedgerTransaction(first.ledger, {
    idempotencyKey: "sess_1",
    type: "focus_reward",
    amount: 10
  });
  assert.equal(duplicate.appended, false);
  assert.equal(duplicate.ledger.length, 1);
});

test("purchase validation checks ownership, premium entitlement, and sufficient funds", () => {
  const ledger = [{ idempotencyKey: "k1", type: "focus_reward", amount: 40 }];
  assert.equal(
    validateItemPurchase({
      item: { id: "skin_gold", price: 50 },
      ledger,
      ownedIds: []
    }).reason,
    "insufficient_funds"
  );
  assert.equal(
    validateItemPurchase({
      item: { id: "theme_space", price: 30, premiumOnly: true },
      ledger,
      ownedIds: [],
      isPremium: false
    }).reason,
    "premium_required"
  );
  assert.equal(
    validateItemPurchase({
      item: { id: "skin_mint", price: 20 },
      ledger,
      ownedIds: ["skin_mint"]
    }).reason,
    "already_owned"
  );
  const ok = validateItemPurchase({
    item: { id: "skin_lavender", price: 25 },
    ledger,
    ownedIds: []
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.remainingBalance, 15);
});
