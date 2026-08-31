/**
 * Group / Workspace Controller
 */

const groupService = require('./group.service');
const { HTTP_STATUS } = require('../../config/constants');

async function create(req, res) {
  try {
    const { name, description, category, privacy, theme } = req.body;
    const group = await groupService.createWorkspace({
      name,
      description,
      category,
      privacy,
      theme,
      userId: req.user.id,
      userFullName: req.user.full_name
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Workspace created successfully.',
      data: group
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function join(req, res) {
  try {
    const { joinCode } = req.body;
    const group = await groupService.joinWorkspace({
      joinCode,
      userId: req.user.id,
      userFullName: req.user.full_name
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Successfully joined ${group.name}!`,
      data: group
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function getMyGroups(req, res) {
  try {
    const groups = await groupService.getUserWorkspaces(req.user.id);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: groups
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
}

async function getDetails(req, res) {
  try {
    const details = await groupService.getWorkspaceDetails(req.params.id, req.user.id);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: details
    });
  } catch (error) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: error.message
    });
  }
}

async function updateRole(req, res) {
  try {
    const { role } = req.body;
    const targetUserId = req.params.userId;
    const result = await groupService.updateMemberRole({
      groupId: req.params.id,
      targetUserId,
      newRole: role,
      actorUserId: req.user.id
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Member role updated.',
      data: result
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function leave(req, res) {
  try {
    await groupService.leaveWorkspace({
      groupId: req.params.id,
      userId: req.user.id,
      userFullName: req.user.full_name
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Left workspace successfully.'
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  create,
  join,
  getMyGroups,
  getDetails,
  updateRole,
  leave
};
