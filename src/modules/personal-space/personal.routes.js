/**
 * Personal Space Routes (Isolated from group members)
 */

const express = require('express');
const router = express.Router();
const personalController = require('./personal.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', personalController.getItems);
router.get('/feed', personalController.getPersonalFeed); // Personal Feed: mentions, approvals, help
router.get('/folders', personalController.getPersonalFolders);
router.post('/folders', personalController.createPersonalFolder);
router.delete('/folders/:folderId', personalController.deletePersonalFolder);
router.post('/', personalController.create);
router.patch('/:id', personalController.update);
router.put('/:id', personalController.update);
router.delete('/:id', personalController.remove);

module.exports = router;
