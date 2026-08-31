/**
 * GroupSpace Authentication Controller with Email Verification & Password Reset
 */

const authService = require('./auth.service');
const { HTTP_STATUS } = require('../../config/constants');

async function sendVerificationCode(req, res) {
  try {
    const { email, type = 'SIGNUP' } = req.body;
    const result = await authService.requestVerificationCode(email, type);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
      code: result.code,
      devCode: result.code
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function verifyCode(req, res) {
  try {
    const { email, code, otpCode, type = 'SIGNUP' } = req.body;
    await authService.verifyCode(email, code || otpCode, type);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Verification code verified successfully.'
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function register(req, res) {
  try {
    const { fullName, email, password, verificationCode, otpCode } = req.body;
    const result = await authService.registerUser({ fullName, email, password, verificationCode, otpCode });

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Account successfully created and verified! Welcome email sent.',
      data: result
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const result = await authService.requestVerificationCode(email, 'RESET_PASSWORD');
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Password reset code sent to ${email}`,
      code: result.code,
      devCode: result.code
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, otpCode, code, newPassword } = req.body;
    const result = await authService.resetPasswordWithOtp({
      email,
      otpCode: otpCode || code,
      newPassword
    });
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Login successful.',
      data: result
    });
  } catch (error) {
    const statusCode = error.status || HTTP_STATUS.UNAUTHORIZED;
    return res.status(statusCode).json({
      success: false,
      message: error.message,
      isLocked: !!error.isLocked,
      remainingSeconds: error.remainingSeconds,
      attemptsLeft: error.attemptsLeft
    });
  }
}

async function getMe(req, res) {
  try {
    const user = await authService.getUserProfile(req.user.id);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: user
    });
  } catch (error) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: error.message
    });
  }
}

async function logout(req, res) {
  if (req.user) {
    try {
      await authService.updateStatus(req.user.id, 'offline');
    } catch (e) {
      // ignore
    }
  }
  res.clearCookie('token');
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Logged out successfully.'
  });
}

module.exports = {
  sendVerificationCode,
  verifyCode,
  register,
  forgotPassword,
  resetPassword,
  login,
  getMe,
  logout
};
