/**
 * Group / Workspace Service
 */

const GroupModel = require('./group.model');
const { ROLES } = require('../../config/constants');
const { generateJoinCode, formatJoinCode, sanitizeText } = require('../../utils/validation.util');

async function createWorkspace({ name, description, category, privacy, theme, userId, userFullName }) {
  const cleanName = sanitizeText(name);
  if (!cleanName || cleanName.length < 2) {
    throw new Error('Workspace name must be at least 2 characters.');
  }

  // Generate unique join code
  let joinCode = generateJoinCode();
  let existing = await GroupModel.findByJoinCode(joinCode);
  while (existing) {
    joinCode = generateJoinCode();
    existing = await GroupModel.findByJoinCode(joinCode);
  }

  const groupId = await GroupModel.create({
    name: cleanName,
    description: sanitizeText(description),
    joinCode,
    category: category || 'School Project',
    privacy: privacy || 'public',
    theme: theme || 'green',
    createdByUserId: userId
  });

  // Add creator as LEADER
  await GroupModel.addMember({
    groupId,
    userId,
    role: ROLES.LEADER
  });

  // Log activity
  await GroupModel.logActivity({
    groupId,
    userId,
    actionType: 'WORKSPACE_CREATED',
    description: `${userFullName || 'A leader'} created workspace "${cleanName}".`
  });

  return await GroupModel.findById(groupId);
}

async function joinWorkspace({ joinCode, userId, userFullName }) {
  const formattedCode = formatJoinCode(joinCode);
  if (!formattedCode) {
    throw new Error('Please enter a valid invitation code.');
  }

  const group = await GroupModel.findByJoinCode(formattedCode);
  if (!group) {
    throw new Error('No workspace found with that invitation code.');
  }

  // Check if already a member
  const existingMembership = await GroupModel.findMember(group.id, userId);
  if (existingMembership) {
    throw new Error('You are already a member of this workspace.');
  }

  // Add as MEMBER
  await GroupModel.addMember({
    groupId: group.id,
    userId,
    role: ROLES.MEMBER
  });

  await GroupModel.logActivity({
    groupId: group.id,
    userId,
    actionType: 'MEMBER_JOINED',
    description: `${userFullName || 'A new member'} joined the workspace.`
  });

  return group;
}

async function getUserWorkspaces(userId) {
  return await GroupModel.findGroupsByUser(userId);
}

async function getWorkspaceDetails(groupId, userId) {
  const group = await GroupModel.findById(groupId);
  if (!group) {
    throw new Error('Workspace not found.');
  }

  const membership = await GroupModel.findMember(groupId, userId);
  if (!membership) {
    throw new Error('You do not belong to this workspace.');
  }

  const members = await GroupModel.findMembersByGroup(groupId);
  const activities = await GroupModel.getActivity(groupId, 15);

  let parsedSettings = {};
  try {
    parsedSettings = typeof group.settings === 'string' ? JSON.parse(group.settings) : (group.settings || {});
  } catch (e) {
    parsedSettings = {};
  }

  return {
    ...group,
    settings: parsedSettings,
    role: membership.role,
    members,
    recentActivity: activities
  };
}

async function updateMemberRole({ groupId, targetUserId, newRole, actorUserId }) {
  if (![ROLES.LEADER, ROLES.CO_LEADER, ROLES.MEMBER].includes(newRole)) {
    throw new Error('Invalid role specified.');
  }

  const targetMember = await GroupModel.findMember(groupId, targetUserId);
  if (!targetMember) {
    throw new Error('Target user is not a member of this workspace.');
  }

  // Never demote the last primary leader
  if (targetMember.role === ROLES.LEADER && newRole !== ROLES.LEADER) {
    const allMembers = await GroupModel.findMembersByGroup(groupId);
    if (allMembers.filter(m => m.role === ROLES.LEADER).length <= 1) {
      throw new Error('A workspace must keep at least one Leader. Promote another Leader first.');
    }
  }

  await GroupModel.updateMemberRole(groupId, targetUserId, newRole);

  await GroupModel.logActivity({
    groupId,
    userId: actorUserId,
    actionType: 'ROLE_UPDATED',
    description: `A leader changed member role to ${newRole === ROLES.CO_LEADER ? 'Co-Leader' : newRole}.`
  });

  return { success: true, newRole };
}

/**
 * A regular member asks the workspace Leader(s) for a leadership role.
 * Stored with status 'pending_leader_request' and surfaced in the Leader's Personal Feed.
 */
async function requestLeadership({ groupId, userId, message }) {
  const membership = await GroupModel.findMember(groupId, userId);
  if (!membership) {
    throw new Error('You are not a member of this workspace.');
  }
  if (membership.role !== ROLES.MEMBER) {
    throw new Error('Only regular members can request a leadership role.');
  }
  const cleanMessage = sanitizeText(message);
  if (!cleanMessage || cleanMessage.length < 5) {
    throw new Error('Please tell the Leader why you want to become a leader (at least 5 characters).');
  }
  const existing = await GroupModel.findPendingLeadershipRequest(groupId, userId);
  if (existing) {
    throw new Error('You already have a pending leadership request for this workspace.');
  }
  const request = await GroupModel.createLeadershipRequest({ groupId, userId, message: cleanMessage });
  await GroupModel.logActivity({
    groupId,
    userId,
    actionType: 'LEADERSHIP_REQUESTED',
    description: 'A member requested a leadership role.'
  });
  return request;
}

/**
 * Primary Leader approves (as 'leader' or 'co_leader') or rejects a leadership request.
 */
async function resolveLeadershipRequest({ groupId, requestId, decision, actorUserId }) {
  const request = await GroupModel.findLeadershipRequest(groupId, requestId);
  if (!request) {
    const err = new Error('Leadership request not found.');
    err.httpStatus = 404;
    throw err;
  }
  if (request.status !== 'pending_leader_request') {
    throw new Error('This leadership request has already been resolved.');
  }

  const normalized = String(decision || '').toLowerCase();
  let status;
  let newRole = null;
  if (normalized === 'leader') { status = 'approved_leader'; newRole = ROLES.LEADER; }
  else if (normalized === 'co_leader') { status = 'approved_co_leader'; newRole = ROLES.CO_LEADER; }
  else if (normalized === 'reject') { status = 'rejected'; }
  else { throw new Error('Invalid decision. Use leader, co_leader, or reject.'); }

  if (newRole) {
    const member = await GroupModel.findMember(groupId, request.user_id);
    if (member && member.role === ROLES.MEMBER) {
      await GroupModel.updateMemberRole(groupId, request.user_id, newRole);
    }
  }
  await GroupModel.resolveLeadershipRequest(requestId, status, actorUserId);
  await GroupModel.createPersonalFeedNotification({
    userId: request.user_id,
    groupId,
    authorUserId,
    content: newRole
      ? `Your leadership request was approved! You are now a ${newRole === ROLES.CO_LEADER ? 'Co-Leader' : 'Leader'}.`
      : 'Your leadership request was reviewed and not approved at this time.',
    type: 'leadership_decision'
  });
  await GroupModel.logActivity({
    groupId,
    userId: actorUserId,
    actionType: 'LEADERSHIP_REQUEST_RESOLVED',
    description: newRole
      ? `A leader approved a leadership request as ${newRole === ROLES.CO_LEADER ? 'Co-Leader' : 'Leader'}.`
      : 'A leader rejected a leadership request.'
  });
  return { requestId: Number(requestId), status, newRole };
}

async function leaveWorkspace({ groupId, userId, userFullName }) {
  const membership = await GroupModel.findMember(groupId, userId);
  if (!membership) {
    throw new Error('You are not a member of this workspace.');
  }

  // Check if sole leader
  if (membership.role === ROLES.LEADER) {
    const allMembers = await GroupModel.findMembersByGroup(groupId);
    const leaderCount = allMembers.filter(m => m.role === ROLES.LEADER).length;
    if (leaderCount <= 1 && allMembers.length > 1) {
      throw new Error('You are the sole leader. Please promote another member to Leader before leaving.');
    }
  }

  await GroupModel.removeMember(groupId, userId);

  await GroupModel.logActivity({
    groupId,
    userId,
    actionType: 'MEMBER_LEFT',
    description: `${userFullName || 'A member'} left the workspace.`
  });

  return { success: true };
}

/**
 * Leader removes another member from the workspace.
 * The leader-only gate is enforced by requireGroupLeader on the route;
 * the actor role is re-verified here as defense in depth.
 */
async function removeMember({ groupId, targetUserId, actorUserId, actorFullName }) {
  const actor = await GroupModel.findMember(groupId, actorUserId);
  if (!actor || actor.role !== ROLES.LEADER) {
    const err = new Error('Only a workspace Leader can remove members.');
    err.httpStatus = 403;
    throw err;
  }

  if (Number(targetUserId) === Number(actorUserId)) {
    const err = new Error('Leaders cannot remove themselves. Use "Leave workspace" instead.');
    err.httpStatus = 400;
    throw err;
  }

  const target = await GroupModel.findMember(groupId, targetUserId);
  if (!target) {
    const err = new Error('Target user is not a member of this workspace.');
    err.httpStatus = 404;
    throw err;
  }

  await GroupModel.removeMember(groupId, targetUserId);

  await GroupModel.logActivity({
    groupId,
    userId: actorUserId,
    actionType: 'MEMBER_REMOVED',
    description: `${actorFullName || 'A leader'} removed a member from the workspace.`
  });

  return { success: true };
}

async function updateWorkspaceSettings({ groupId, name, settings, actorUserId, actorFullName }) {
  let cleanName = null;
  if (name !== undefined) {
    cleanName = sanitizeText(name);
    if (!cleanName || cleanName.length < 2) {
      throw new Error('Workspace name must be at least 2 characters.');
    }
  }

  const updated = await GroupModel.updateWorkspace(groupId, {
    name: cleanName,
    settings
  });

  await GroupModel.logActivity({
    groupId,
    userId: actorUserId,
    actionType: 'WORKSPACE_SETTINGS_UPDATED',
    description: `${actorFullName || 'Leader'} updated workspace settings.`
  });

  return updated;
}

async function resetWorkspaceJoinCode({ groupId, actorUserId, actorFullName }) {
  let newJoinCode = generateJoinCode();
  let existing = await GroupModel.findByJoinCode(newJoinCode);
  while (existing) {
    newJoinCode = generateJoinCode();
    existing = await GroupModel.findByJoinCode(newJoinCode);
  }

  const updated = await GroupModel.updateJoinCode(groupId, newJoinCode);

  await GroupModel.logActivity({
    groupId,
    userId: actorUserId,
    actionType: 'JOIN_CODE_RESET',
    description: `${actorFullName || 'Leader'} reset the workspace invite code.`
  });

  return { joinCode: newJoinCode, workspace: updated };
}

async function deleteWorkspace({ groupId, actorUserId }) {
  if (!groupId) {
    throw new Error('Workspace ID is required.');
  }

  const group = await GroupModel.findById(Number(groupId));
  if (!group) {
    const err = new Error('Workspace not found.');
    err.httpStatus = 404;
    throw err;
  }

  const member = await GroupModel.findMember(Number(groupId), actorUserId);
  if (!member || member.role !== ROLES.LEADER) {
    const err = new Error('Forbidden: Only workspace leaders can delete this workspace.');
    err.httpStatus = 403;
    throw err;
  }

  await GroupModel.deleteWorkspace(Number(groupId));
  return { success: true };
}

module.exports = {
  requestLeadership,
  resolveLeadershipRequest,
  createWorkspace,
  joinWorkspace,
  getUserWorkspaces,
  getWorkspaceDetails,
  updateMemberRole,
  leaveWorkspace,
  removeMember,
  updateWorkspaceSettings,
  resetWorkspaceJoinCode,
  deleteWorkspace
};
