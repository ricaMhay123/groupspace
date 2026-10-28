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

async function removeMember(req, res) {
  try {
    await groupService.removeMember({
      groupId: req.params.groupId,
      targetUserId: req.params.userId,
      actorUserId: req.user.id,
      actorFullName: req.user.full_name
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Member removed from workspace.'
    });
  } catch (error) {
    return res.status(error.httpStatus || HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function updateSettings(req, res) {
  try {
    const { name, settings } = req.body;
    const groupId = req.params.id || req.params.groupId;
    const updated = await groupService.updateWorkspaceSettings({
      groupId,
      name,
      settings,
      actorUserId: req.user.id,
      actorFullName: req.user.full_name
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Workspace settings updated.',
      data: updated
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function resetJoinCode(req, res) {
  try {
    const groupId = req.params.id || req.params.groupId;
    const result = await groupService.resetWorkspaceJoinCode({
      groupId,
      actorUserId: req.user.id,
      actorFullName: req.user.full_name
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Workspace invite code regenerated.',
      data: result
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function deleteWorkspace(req, res) {
  try {
    const groupId = req.params.groupId || req.params.id;
    await groupService.deleteWorkspace({
      groupId,
      actorUserId: req.user.id
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Workspace deleted successfully.'
    });
  } catch (error) {
    return res.status(error.httpStatus || HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function requestLeadership(req, res) {
  try {
    const data = await groupService.requestLeadership({
      groupId: req.params.id,
      userId: req.user.id,
      message: req.body.message
    });
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Leadership request sent to the workspace Leader.',
      data
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
}

async function resolveLeadershipRequest(req, res) {
  try {
    const data = await groupService.resolveLeadershipRequest({
      groupId: req.params.id,
      requestId: req.params.requestId,
      decision: req.body.decision,
      actorUserId: req.user.id
    });
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: data.newRole ? 'Leadership request approved.' : 'Leadership request rejected.',
      data
    });
  } catch (error) {
    return res.status(error.httpStatus || HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
}

module.exports = {
  requestLeadership,
  resolveLeadershipRequest,
  create,
  join,
  getMyGroups,
  getDetails,
  updateRole,
  leave,
  removeMember,
  updateSettings,
  resetJoinCode,
  deleteWorkspace
};
