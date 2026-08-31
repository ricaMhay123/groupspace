/**
 * Collaborative Notebook Service
 */

const NotebookModel = require('./notebook.model');
const GroupModel = require('../groups/group.model');
const { ROLES } = require('../../config/constants');
const { sanitizeText } = require('../../utils/validation.util');

async function createNote({ groupId, title, content, tags, isPinned, authorUserId, authorName }) {
  const cleanTitle = sanitizeText(title);
  if (!cleanTitle) {
    throw new Error('Note title is required.');
  }

  const noteId = await NotebookModel.create({
    groupId,
    title: cleanTitle,
    content: content || '',
    tags: sanitizeText(tags),
    isPinned: Boolean(isPinned),
    authorUserId
  });

  await GroupModel.logActivity({
    groupId,
    userId: authorUserId,
    actionType: 'NOTE_CREATED',
    description: `${authorName || 'A member'} created notebook page: "${cleanTitle}".`
  });

  return await NotebookModel.findById(noteId);
}

async function getGroupNotes(groupId, searchQuery) {
  return await NotebookModel.findByGroup(groupId, searchQuery);
}

async function updateNote({ noteId, groupId, title, content, tags, isPinned, userId, userRole, userName }) {
  const note = await NotebookModel.findById(noteId);
  if (!note || note.group_id !== Number(groupId)) {
    throw new Error('Note not found in this workspace.');
  }

  const updates = {};
  if (title !== undefined) updates.title = sanitizeText(title);
  if (content !== undefined) updates.content = content;
  if (tags !== undefined) updates.tags = sanitizeText(tags);
  if (isPinned !== undefined) updates.is_pinned = isPinned ? 1 : 0;

  await NotebookModel.update(noteId, updates);

  await GroupModel.logActivity({
    groupId,
    userId,
    actionType: 'NOTE_UPDATED',
    description: `${userName || 'A member'} updated note: "${updates.title || note.title}".`
  });

  return await NotebookModel.findById(noteId);
}

async function deleteNote({ noteId, groupId, userId, userRole }) {
  const note = await NotebookModel.findById(noteId);
  if (!note || note.group_id !== Number(groupId)) {
    throw new Error('Note not found.');
  }

  // Only the author or a leader can delete a note
  if (note.author_user_id !== userId && userRole !== ROLES.LEADER) {
    throw new Error('You do not have permission to delete this note.');
  }

  await NotebookModel.delete(noteId);
  return { success: true };
}

module.exports = {
  createNote,
  getGroupNotes,
  updateNote,
  deleteNote
};
