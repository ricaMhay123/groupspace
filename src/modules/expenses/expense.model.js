/**
 * Expense Ledger Data Model
 */

const sql = require('../../config/db.config');

const ExpenseModel = {
  async create({ groupId, title, amount, category, paidByUserId, splitType, date, notes, splits = [] }) {
    const [result] = await sql`
      INSERT INTO expenses (group_id, title, amount, category, paid_by_user_id, split_type, date, notes)
      VALUES (${groupId}, ${title}, ${amount}, ${category || 'General'}, ${paidByUserId}, ${splitType || 'EQUAL'}, ${date || new Date().toISOString().split('T')[0]}, ${notes || ''})
      RETURNING id
    `;
    const expenseId = Number(result.id);

    // Insert split rows
    if (splits.length > 0) {
      for (const s of splits) {
        await sql`
          INSERT INTO expense_splits (expense_id, user_id, amount)
          VALUES (${expenseId}, ${s.userId}, ${s.amount})
        `;
      }
    }

    return expenseId;
  },

  async findById(id) {
    const [expense] = await sql`
      SELECT e.*, u.full_name as payer_name, u.avatar_initials as payer_initials
      FROM expenses e
      JOIN users u ON e.paid_by_user_id = u.id
      WHERE e.id = ${id}
    `;

    if (!expense) return null;

    const splits = await sql`
      SELECT es.*, u.full_name as user_name
      FROM expense_splits es
      JOIN users u ON es.user_id = u.id
      WHERE es.expense_id = ${id}
    `;

    return { ...expense, splits };
  },

  async findByGroup(groupId) {
    const expenses = await sql`
      SELECT e.*, u.full_name as payer_name, u.avatar_initials as payer_initials
      FROM expenses e
      JOIN users u ON e.paid_by_user_id = u.id
      WHERE e.group_id = ${groupId}
      ORDER BY e.created_at DESC
    `;

    const results = [];
    for (const exp of expenses) {
      const splits = await sql`
        SELECT es.*, u.full_name as user_name
        FROM expense_splits es
        JOIN users u ON es.user_id = u.id
        WHERE es.expense_id = ${exp.id}
      `;
      results.push({ ...exp, splits });
    }
    return results;
  },

  async delete(id) {
    return await sql`DELETE FROM expenses WHERE id = ${id}`;
  }
};

module.exports = ExpenseModel;
