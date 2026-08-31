/**
 * Collaborative Notebook Controller
 */

const notebookService = require('./notebook.service');
const { HTTP_STATUS } = require('../../config/constants');

async function getNotes(req, res) {
  try {
    const notes = await notebookService.getGroupNotes(req.params.groupId, req.query.search);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: notes
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
    const { title, content, tags, isPinned } = req.body;
    const note = await notebookService.createNote({
      groupId: req.params.groupId,
      title,
      content,
      tags,
      isPinned,
      authorUserId: req.user.id,
      authorName: req.user.full_name
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Note created successfully.',
      data: note
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function update(req, res) {
  try {
    const { title, content, tags, isPinned } = req.body;
    const note = await notebookService.updateNote({
      noteId: req.params.noteId,
      groupId: req.params.groupId,
      title,
      content,
      tags,
      isPinned,
      userId: req.user.id,
      userRole: req.membership.role,
      userName: req.user.full_name
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Note updated.',
      data: note
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
    await notebookService.deleteNote({
      noteId: req.params.noteId,
      groupId: req.params.groupId,
      userId: req.user.id,
      userRole: req.membership.role
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Note deleted.'
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getNotes,
  create,
  update,
  remove
};
