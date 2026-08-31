/**
 * Expense Ledger Service with Net Summary & Debt Splitting
 */

const ExpenseModel = require('./expense.model');
const GroupModel = require('../groups/group.model');
const { calculateExpenseSummary, roundToTwo } = require('../../utils/calculation.util');
const { isValidAmount, sanitizeText } = require('../../utils/validation.util');
const { ROLES, EXPENSE_SPLIT_TYPE } = require('../../config/constants');

async function addExpense({ groupId, title, amount, category, paidByUserId, splitType = 'EQUAL', participantUserIds = [], customSplits = [], date, notes, actorName }) {
  const cleanTitle = sanitizeText(title);
  if (!cleanTitle) {
    throw new Error('Expense description/title is required.');
  }

  if (!isValidAmount(amount)) {
    throw new Error('Please enter a valid positive expense amount.');
  }

  const numAmount = roundToTwo(amount);
  const members = await GroupModel.findMembersByGroup(groupId);

  let splits = [];
  if (splitType === EXPENSE_SPLIT_TYPE.EXACT && customSplits.length > 0) {
    // Validate custom splits total matches amount
    let sum = 0;
    splits = customSplits.map(s => {
      const splitAmt = roundToTwo(s.amount);
      sum = roundToTwo(sum + splitAmt);
      return { userId: Number(s.userId), amount: splitAmt };
    });

    if (Math.abs(sum - numAmount) > 0.05) {
      throw new Error(`Custom split amounts ($${sum}) must equal total expense amount ($${numAmount}).`);
    }
  } else {
    // Equal split among participants (or all members if none selected)
    let participants = participantUserIds.length > 0
      ? participantUserIds.map(Number)
      : members.map(m => m.user_id);

    // Remove duplicates
    participants = [...new Set(participants)];
    const count = participants.length || 1;
    const perPerson = roundToTwo(numAmount / count);

    splits = participants.map(uid => ({
      userId: uid,
      amount: perPerson
    }));
  }

  const expenseId = await ExpenseModel.create({
    groupId,
    title: cleanTitle,
    amount: numAmount,
    category: sanitizeText(category) || 'General',
    paidByUserId: Number(paidByUserId),
    splitType,
    date,
    notes: sanitizeText(notes),
    splits
  });

  await GroupModel.logActivity({
    groupId,
    userId: paidByUserId,
    actionType: 'EXPENSE_LOGGED',
    description: `${actorName || 'A member'} logged expense: "${cleanTitle}" ($${numAmount.toFixed(2)}).`
  });

  return await ExpenseModel.findById(expenseId);
}

async function getGroupExpenses(groupId) {
  return await ExpenseModel.findByGroup(groupId);
}

async function getExpenseSummary(groupId) {
  const expenses = await ExpenseModel.findByGroup(groupId);
  const members = await GroupModel.findMembersByGroup(groupId);
  return calculateExpenseSummary(expenses, members);
}

async function deleteExpense({ expenseId, groupId, userId, userRole }) {
  const exp = await ExpenseModel.findById(expenseId);
  if (!exp || exp.group_id !== Number(groupId)) {
    throw new Error('Expense not found in this workspace.');
  }

  if (exp.paid_by_user_id !== userId && userRole !== ROLES.LEADER) {
    throw new Error('Only the member who paid or a workspace Leader can delete this expense.');
  }

  await ExpenseModel.delete(expenseId);
  return { success: true };
}

module.exports = {
  addExpense,
  getGroupExpenses,
  getExpenseSummary,
  deleteExpense
};
