/**
 * Collaborative Notebook Routes
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const notebookController = require('./notebook.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { requireGroupMembership } = require('../../middleware/role.middleware');

router.use(authMiddleware);
router.use(requireGroupMembership);

router.get('/', notebookController.getNotes);
router.post('/', notebookController.create);
router.patch('/:noteId', notebookController.update);
router.put('/:noteId', notebookController.update);
router.delete('/:noteId', notebookController.remove);

module.exports = router;
