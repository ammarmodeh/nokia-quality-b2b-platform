import mongoose from "mongoose";

// Standalone mongod (local dev) has no transactions; Atlas / replica sets do.
const NO_TXN = /Transaction numbers are only allowed|replica set|IllegalOperation/i;
let transactionsSupported = null; // learned on first use

/**
 * Runs `work(session, undo)` atomically. On a replica set it is a real transaction.
 * Without transaction support it runs the same writes with session = null and, if anything
 * throws, calls the compensations registered through `undo(fn)` in reverse order.
 */
export const withTransaction = async (work) => {
  if (transactionsSupported !== false) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session, () => {});
      });
      transactionsSupported = true;
      return result;
    } catch (err) {
      if (!NO_TXN.test(err?.message || "") || transactionsSupported === true) throw err;
      transactionsSupported = false;
    } finally {
      await session.endSession();
    }
  }
  const undos = [];
  try {
    return await work(null, (fn) => undos.push(fn));
  } catch (err) {
    for (const fn of undos.reverse()) {
      try {
        await fn();
      } catch (undoErr) {
        console.error("compensation failed:", undoErr);
      }
    }
    throw err;
  }
};
