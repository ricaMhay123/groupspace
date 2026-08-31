/**
 * GroupSpace Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

router.post('/send-verification-code', authController.sendVerificationCode);
router.post('/verify-code', authController.verifyCode);
router.post('/register', authController.register);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
