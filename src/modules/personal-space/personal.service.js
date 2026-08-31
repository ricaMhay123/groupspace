/**
 * Personal Space Service (Isolated personal notes, tasks, expenses)
 */

const PersonalModel = require('./personal.model');
const { sanitizeText, isValidAmount } = require('../../utils/validation.util');

async function getPersonalItems(userId, type, groupId = null) {
  if (type) {
    return await PersonalModel.findByType(userId, type.toUpperCase(), groupId);
  }
  return await PersonalModel.findAllByUser(userId, groupId);
}

async function addPersonalItem({ userId, groupId, type, title, content, amount, category, dueDate }) {
  const cleanTitle = sanitizeText(title);
  if (!cleanTitle) {
    throw new Error('Title is required for personal items.');
  }

  const validTypes = ['NOTE', 'TASK', 'EXPENSE'];
  const upperType = (type || 'NOTE').toUpperCase();
  if (!validTypes.includes(upperType)) {
    throw new Error('Invalid personal item type.');
  }

  let numAmount = 0;
  if (upperType === 'EXPENSE') {
    if (!isValidAmount(amount)) {
      throw new Error('Please enter a valid expense amount.');
    }
    numAmount = Number(amount);
  }

  const itemId = await PersonalModel.createItem({
    userId,
    groupId: groupId ? Number(groupId) : null,
    type: upperType,
    title: cleanTitle,
    content: content || '',
    status: 'PENDING',
    amount: numAmount,
    category: sanitizeText(category) || 'Personal',
    dueDate: dueDate || null
  });

  return await PersonalModel.findById(itemId, userId);
}

async function updatePersonalItem({ id, userId, title, content, status, amount, category }) {
  const item = await PersonalModel.findById(id, userId);
  if (!item) {
    throw new Error('Personal item not found.');
  }

  const updates = {};
  if (title !== undefined) updates.title = sanitizeText(title);
  if (content !== undefined) updates.content = content;
  if (status !== undefined) updates.status = status;
  if (amount !== undefined) updates.amount = Number(amount);
  if (category !== undefined) updates.category = sanitizeText(category);

  await PersonalModel.update(id, userId, updates);
  return await PersonalModel.findById(id, userId);
}

async function deletePersonalItem(id, userId) {
  const item = await PersonalModel.findById(id, userId);
  if (!item) {
    throw new Error('Item not found.');
  }
  await PersonalModel.delete(id, userId);
  return { success: true };
}

module.exports = {
  getPersonalItems,
  addPersonalItem,
  updatePersonalItem,
  deletePersonalItem
};
