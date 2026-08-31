/**
 * Expense Ledger Controller
 */

const expenseService = require('./expense.service');
const { HTTP_STATUS } = require('../../config/constants');

async function getExpenses(req, res) {
  try {
    const expenses = await expenseService.getGroupExpenses(req.params.groupId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: expenses
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
}

async function getSummary(req, res) {
  try {
    const summary = await expenseService.getExpenseSummary(req.params.groupId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: summary
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
}

async function create(req, res) {
  try {
    const { title, amount, category, paidByUserId, splitType, participantUserIds, customSplits, date, notes } = req.body;
    const expense = await expenseService.addExpense({
      groupId: req.params.groupId,
      title,
      amount,
      category,
      paidByUserId: paidByUserId || req.user.id,
      splitType,
      participantUserIds,
      customSplits,
      date,
      notes,
      actorName: req.user.full_name
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Expense added to ledger.',
      data: expense
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function remove(req, res) {
  try {
    await expenseService.deleteExpense({
      expenseId: req.params.expenseId,
      groupId: req.params.groupId,
      userId: req.user.id,
      userRole: req.membership.role
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Expense removed.'
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getExpenses,
  getSummary,
  create,
  remove
};
