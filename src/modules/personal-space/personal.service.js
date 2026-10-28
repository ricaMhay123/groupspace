/**
 * Personal Space Service (Isolated personal notes, tasks, expenses)
 */

const PersonalModel = require('./personal.model');
const { extractAutoTitleFromContent } = require('../notebook/notebook.service');
const { sanitizeText, isValidAmount } = require('../../utils/validation.util');

async function getPersonalItems(userId, type, groupId = null, searchQuery = '') {
  if (type) {
    return await PersonalModel.findByType(userId, type.toUpperCase(), groupId, searchQuery);
  }
  return await PersonalModel.findAllByUser(userId, groupId);
}

async function addPersonalItem({ userId, groupId, type, title, content, amount, category, dueDate, folderId, tags, isPinned }) {
  const validTypes = ['NOTE', 'TASK', 'EXPENSE'];
  const upperType = (type || 'NOTE').toUpperCase();
  if (!validTypes.includes(upperType)) {
    throw new Error('Invalid personal item type.');
  }

  let cleanTitle = sanitizeText(title);
  if (upperType === 'NOTE') {
    cleanTitle = extractAutoTitleFromContent(title, content);
  } else if (!cleanTitle) {
    throw new Error('Title is required for personal items.');
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
    dueDate: dueDate || null,
    folderId: folderId ? Number(folderId) : null,
    tags: sanitizeText(tags) || '',
    isPinned: Boolean(isPinned)
  });

  return await PersonalModel.findById(itemId, userId);
}

async function updatePersonalItem({ id, userId, title, content, status, amount, category, folderId, tags, isPinned }) {
  const item = await PersonalModel.findById(id, userId);
  if (!item) {
    throw new Error('Personal item not found.');
  }

  const updates = {};
  if (item.type === 'NOTE') {
    if (title !== undefined || content !== undefined) {
      updates.title = extractAutoTitleFromContent(title, content !== undefined ? content : item.content);
    }
  } else if (title !== undefined) {
    updates.title = sanitizeText(title);
  }

  if (content !== undefined) updates.content = content;
  if (status !== undefined) updates.status = status;
  if (amount !== undefined) updates.amount = Number(amount);
  if (category !== undefined) updates.category = sanitizeText(category);
  if (folderId !== undefined) updates.folder_id = folderId;
  if (tags !== undefined) updates.tags = sanitizeText(tags);
  if (isPinned !== undefined) updates.is_pinned = isPinned;

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
