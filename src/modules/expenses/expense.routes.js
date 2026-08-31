/**
 * Expense Ledger Routes
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const expenseController = require('./expense.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { requireGroupMembership } = require('../../middleware/role.middleware');

router.use(authMiddleware);
router.use(requireGroupMembership);

router.get('/', expenseController.getExpenses);
router.get('/summary', expenseController.getSummary);
router.post('/', expenseController.create);
router.delete('/:expenseId', expenseController.remove);

module.exports = router;
