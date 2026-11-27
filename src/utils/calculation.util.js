/**
 * GroupSpace Expense Calculation & Debt Simplification Utility
 */

/**
 * Calculates net balances for a list of expenses and members.
 * @param {Array} expenses - Array of expense objects with { id, amount, paid_by_user_id, split_type, splits: [{ user_id, amount }] }
 * @param {Array} members - Array of member objects with { user_id, full_name, email }
 * @returns {Object} { totalSpent, memberBalances: { [userId]: { paid, share, net } }, settlements: [{ from, to, amount }] }
 */
function calculateExpenseSummary(expenses = [], members = []) {
  const memberMap = new Map();

  // Initialize members in the ledger
  members.forEach(member => {
    const id = Number(member.user_id || member.id);
    memberMap.set(id, {
      userId: id,
      fullName: member.full_name || member.name || 'Unknown',
      email: member.email || '',
      paid: 0,
      share: 0,
      net: 0
    });
  });

  let totalSpent = 0;

  expenses.forEach(exp => {
    const amount = roundToTwo(exp.amount);
    if (amount <= 0) return;
    const payerId = Number(exp.paid_by_user_id || exp.paid_by);
    const isSettlement = String(exp.category || '').trim().toLowerCase() === 'settlement'
      || /^settlement:/i.test(String(exp.title || '').trim());

    if (!isSettlement) {
      totalSpent = roundToTwo(totalSpent + amount);
    }

    if (!memberMap.has(payerId)) {
      memberMap.set(payerId, {
        userId: payerId,
        fullName: exp.payer_name || 'Member #' + payerId,
        email: '',
        paid: 0,
        share: 0,
        net: 0
      });
    }

    const payer = memberMap.get(payerId);
    payer.paid = roundToTwo(payer.paid + amount);

    const splits = exp.splits || [];
    if (splits.length > 0) {
      let splitSum = 0;
      let lastParticipant = null;
      splits.forEach(split => {
        const participantId = Number(split.user_id);
        const participantShare = roundToTwo(split.amount);

        if (!memberMap.has(participantId)) {
          memberMap.set(participantId, {
            userId: participantId,
            fullName: split.user_name || 'Member #' + participantId,
            email: '',
            paid: 0,
            share: 0,
            net: 0
          });
        }
        const participant = memberMap.get(participantId);
        participant.share = roundToTwo(participant.share + participantShare);
        splitSum = roundToTwo(splitSum + participantShare);
        lastParticipant = participant;
      });

      // Absorb any 1-2 cent rounding remainder so sum(shares) === amount (no 0.01 ghosts)
      const remainder = roundToTwo(amount - splitSum);
      if (lastParticipant && Math.abs(remainder) > 0 && Math.abs(remainder) <= 0.05) {
        lastParticipant.share = roundToTwo(lastParticipant.share + remainder);
      }
    } else {
      // If no explicit splits given, assume equal split among all current group members
      const activeMembers = Array.from(memberMap.values());
      const count = activeMembers.length || 1;
      const equalShare = roundToTwo(amount / count);
      const remainder = roundToTwo(amount - roundToTwo(equalShare * count));

      activeMembers.forEach((mem, idx) => {
        const shareAmt = idx === activeMembers.length - 1 ? roundToTwo(equalShare + remainder) : equalShare;
        mem.share = roundToTwo(mem.share + shareAmt);
      });
    }
  });

  // Calculate net balances: positive means they are owed money; negative means they owe money
  const memberBalances = {};
  const debtors = [];  // net < 0 (owe money)
  const creditors = []; // net > 0 (are owed money)

  memberMap.forEach((data, id) => {
    const rawNet = roundToTwo(data.paid - data.share);
    data.net = Math.abs(rawNet) <= 0.01 ? 0 : rawNet;
    memberBalances[id] = data;

    if (data.net < -0.01) {
      debtors.push({ userId: id, name: data.fullName, amount: roundToTwo(Math.abs(data.net)) });
    } else if (data.net > 0.01) {
      creditors.push({ userId: id, name: data.fullName, amount: roundToTwo(data.net) });
    }
  });

  // Calculate simplified settlements using greedy matching
  const settlements = simplifyDebts(debtors, creditors);

  return {
    totalSpent: roundToTwo(totalSpent),
    memberBalances: Object.values(memberBalances),
    settlements
  };
}

/**
 * Greedily resolves debts between debtors and creditors with minimal transactions.
 */
function simplifyDebts(debtors, creditors) {
  const settlements = [];
  let dIdx = 0;
  let cIdx = 0;

  // Clone to prevent side effects
  const dList = debtors.map(d => ({ ...d }));
  const cList = creditors.map(c => ({ ...c }));

  while (dIdx < dList.length && cIdx < cList.length) {
    const debtor = dList[dIdx];
    const creditor = cList[cIdx];

    const settledAmount = roundToTwo(Math.min(debtor.amount, creditor.amount));
    if (settledAmount > 0.01 && Number(debtor.userId) !== Number(creditor.userId)) {
      settlements.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amount: settledAmount
      });
    }

    debtor.amount = roundToTwo(debtor.amount - settledAmount);
    creditor.amount = roundToTwo(creditor.amount - settledAmount);

    if (debtor.amount <= 0.01) {
      debtor.amount = 0;
      dIdx++;
    }
    if (creditor.amount <= 0.01) {
      creditor.amount = 0;
      cIdx++;
    }
  }

  return settlements;
}

/**
 * Helper to round to 2 decimal places.
 */
function roundToTwo(num) {
  const val = Number(num) || 0;
  return Math.round(val * 100) / 100;
}

module.exports = {
  calculateExpenseSummary,
  simplifyDebts,
  roundToTwo
};
