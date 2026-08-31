/**
 * Personal Space Routes (Isolated from group members)
 */

const express = require('express');
const router = express.Router();
const personalController = require('./personal.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', personalController.getItems);
router.post('/', personalController.create);
router.patch('/:id', personalController.update);
router.put('/:id', personalController.update);
router.delete('/:id', personalController.remove);

module.exports = router;
