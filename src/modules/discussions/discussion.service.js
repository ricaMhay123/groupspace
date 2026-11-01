/**
 * Discussion & Activity Feed Service
 * All discussions, replies, and mentions are strictly scoped to groupId.
 */

'use strict';

const DiscussionModel = require('./discussion.model');
const GroupModel = require('../groups/group.model');
const { ROLES } = require('../../config/constants');
const { isAdminRole } = require('../../config/constants');
const { sanitizeText } = require('../../utils/validation.util');

/**
 * Normalizes attachment list to guarantee { file_name, file_url, file_type } structure.
 */
function normalizeAttachments(attachments) {
  if (!attachments) return [];
  let parsed = attachments;
  if (typeof attachments === 'string') {
    try {
      parsed = JSON.parse(attachments);
    } catch (e) {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(att => {
      if (!att || typeof att !== 'object') return null;
      const fileName = String(att.file_name || att.name || 'attachment').trim();
      const fileUrl = String(att.file_url || att.url || '').trim();
      let fileType = String(att.file_type || att.type || '').trim().toLowerCase();

      if (!fileType && fileName) {
        const lowerName = fileName.toLowerCase();
        if (/\.(png|jpe?g|gif|webp|svg)$/.test(lowerName)) {
          fileType = 'image/' + (lowerName.endsWith('jpg') ? 'jpeg' : lowerName.split('.').pop());
        } else if (lowerName.endsWith('.pdf')) {
          fileType = 'application/pdf';
        } else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
          fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (lowerName.endsWith('.txt')) {
          fileType = 'text/plain';
        }
      }

      return {
        file_name: fileName,
        file_url: fileUrl,
        file_type: fileType
      };
    })
    .filter(att => att && att.file_url);
}

async function createTopic({ groupId, title, category, authorUserId, authorName, attachments = [] }) {
  if (!groupId) {
    throw new Error('Workspace ID is required to create a topic.');
  }

  const cleanTitle = sanitizeText(title);
  if (!cleanTitle) {
    throw new Error('Topic title is required.');
  }

  const normalizedAttachments = normalizeAttachments(attachments);
  const topicId = await DiscussionModel.createTopic({
    groupId: Number(groupId),
    title: cleanTitle,
    category: sanitizeText(category) || 'General',
    authorUserId,
    attachments: normalizedAttachments
  });

  await GroupModel.logActivity({
    groupId: Number(groupId),
    userId: authorUserId,
    actionType: 'TOPIC_CREATED',
    description: `${authorName || 'A member'} created discussion topic: "${cleanTitle}".`
  });

  const createdTopic = await DiscussionModel.findByIdInGroup(topicId, Number(groupId));
  if (createdTopic) {
    createdTopic.attachments = normalizeAttachments(createdTopic.attachments);
  }
  return createdTopic;
}

async function getGroupTopics(groupId) {
  if (!groupId) return [];
  const topics = await DiscussionModel.findByGroup(Number(groupId));
  return topics.map(t => ({
    ...t,
    attachments: normalizeAttachments(t.attachments)
  }));
}

async function getTopicDetails(topicId, groupId) {
  const topic = await DiscussionModel.findByIdInGroup(Number(topicId), Number(groupId));
  if (!topic) {
    const err = new Error('Discussion topic not found in this workspace.');
    err.status = 404;
    throw err;
  }

  const rawComments = await DiscussionModel.getComments(Number(topicId), Number(groupId));
  const comments = rawComments.map(c => ({
    ...c,
    attachments: normalizeAttachments(c.attachments)
  }));

  return {
    ...topic,
    attachments: normalizeAttachments(topic.attachments),
    comments
  };
}

async function postComment({ topicId, groupId, content, userId, userName, attachments = [] }) {
  const cleanContent = sanitizeText(content);
  if (!cleanContent && (!attachments || attachments.length === 0)) {
    throw new Error('Comment must have text content or at least one attachment.');
  }

  // 1. Ensure topic belongs explicitly to this groupId
  const topic = await DiscussionModel.findByIdInGroup(Number(topicId), Number(groupId));
  if (!topic) {
    const err = new Error('Topic not found in this workspace.');
    err.status = 404;
    throw err;
  }

  // 2. Insert comment with attachments
  const normalizedAttachments = normalizeAttachments(attachments);
  const commentId = await DiscussionModel.addComment({
    discussionId: Number(topicId),
    userId,
    content: cleanContent || '',
    attachments: normalizedAttachments
  });

  // 3. Process workspace-scoped @mentions (supports multiple members in one comment)
  try {
    const groupMembers = await DiscussionModel.getAllGroupMembers(Number(groupId));
    const lowerContent = cleanContent.toLowerCase();

    // Check each enrolled member (all mentioned members will be processed)
    for (const member of groupMembers) {
      if (Number(member.id) === Number(userId)) continue; // Don't notify self

      const memberName = (member.name || '').toLowerCase();
      const firstName = memberName.split(' ')[0];
      const compactName = memberName.replace(/\s+/g, '');

      const isMentioned = lowerContent.includes(`@${memberName}`) ||
                          (firstName.length > 2 && lowerContent.includes(`@${firstName}`)) ||
                          lowerContent.includes(`@${compactName}`) ||
                          lowerContent.includes(`@[${memberName}]`);

      if (isMentioned) {
        await DiscussionModel.addMention({
          groupId: Number(groupId),
          discussionId: Number(topicId),
          commentId,
          mentionedUserId: member.id,
          taskId: null,
          mentionedTopicId: null,
          authorUserId: userId
        });

        await GroupModel.logActivity({
          groupId: Number(groupId),
          userId,
          actionType: 'MEMBER_MENTIONED',
          description: `${userName || 'A member'} mentioned @${member.name} in "${topic.title}".`
        });
      }
    }

    // 4. Process workspace-scoped #topic mentions
    const groupTopics = await DiscussionModel.getAllGroupTopics(Number(groupId));
    for (const t of groupTopics) {
      if (Number(t.id) === Number(topicId)) continue; // Don't link current topic inside itself

      const topicTitleLower = (t.title || '').toLowerCase();
      const isTopicReferenced = cleanContent.includes(`#[${t.title}]`) ||
                               lowerContent.includes(`#[${topicTitleLower}]`) ||
                               cleanContent.includes(`#topic:${t.id}`) ||
                               cleanContent.includes(`#topic-${t.id}`) ||
                               (topicTitleLower.length > 3 && lowerContent.includes(`#${topicTitleLower}`));

      if (isTopicReferenced) {
        await DiscussionModel.addMention({
          groupId: Number(groupId),
          discussionId: Number(topicId),
          commentId,
          mentionedUserId: (t.author_user_id && Number(t.author_user_id) !== Number(userId)) ? t.author_user_id : null,
          taskId: null,
          mentionedTopicId: t.id,
          authorUserId: userId
        });

        await GroupModel.logActivity({
          groupId: Number(groupId),
          userId,
          actionType: 'TOPIC_MENTIONED',
          description: `${userName || 'A member'} referenced topic "${t.title}" in "${topic.title}".`
        });
      }
    }

    // 5. Process workspace-scoped #task mentions
    const groupTasks = await DiscussionModel.getAllGroupTasks(Number(groupId));
    for (const task of groupTasks) {
      const taskTitleLower = (task.title || '').toLowerCase();
      const isTaskReferenced = cleanContent.includes(`#${task.id}`) ||
                               cleanContent.includes(`#[task:${task.id}]`) ||
                               cleanContent.includes(`#[${task.title}]`) ||
                               (taskTitleLower.length > 3 && lowerContent.includes(`#[${taskTitleLower}]`));

      if (isTaskReferenced) {
        if (task.assigned_to_user_id && Number(task.assigned_to_user_id) !== Number(userId)) {
          await DiscussionModel.addMention({
            groupId: Number(groupId),
            discussionId: Number(topicId),
            commentId,
            mentionedUserId: task.assigned_to_user_id,
            taskId: task.id,
            mentionedTopicId: null,
            authorUserId: userId
          });
        }

        await GroupModel.logActivity({
          groupId: Number(groupId),
          userId,
          actionType: 'TASK_MENTIONED',
          description: `${userName || 'A member'} referenced task #${task.id} ("${task.title}") in "${topic.title}".`
        });
      }
    }
  } catch (mentionErr) {
    console.warn('[DiscussionService] Mention detection warning:', mentionErr.message);
  }

  // 5. General comment activity log
  await GroupModel.logActivity({
    groupId: Number(groupId),
    userId,
    actionType: 'COMMENT_POSTED',
    description: `${userName || 'A member'} replied to topic: "${topic.title}".`
  });

  const comments = await DiscussionModel.getComments(Number(topicId), Number(groupId));
  return comments.find(c => c.id === commentId);
}

async function deleteTopic({ topicId, groupId, userId, userRole }) {
  const topic = await DiscussionModel.findByIdInGroup(Number(topicId), Number(groupId));
  if (!topic) {
    const err = new Error('Topic not found in this workspace.');
    err.status = 404;
    throw err;
  }

  if (topic.author_user_id !== userId && !isAdminRole(userRole)) {
    const err = new Error('Only the author or a workspace Leader can delete this topic.');
    err.status = 403;
    throw err;
  }

  await DiscussionModel.deleteTopic(Number(topicId));
  return { success: true };
}

async function getActivityFeed(groupId) {
  if (!groupId) return [];
  return await DiscussionModel.getActivityFeed(Number(groupId), 30);
}

async function getMentionableUsers(groupId, query = '') {
  if (!groupId) return [];
  return await DiscussionModel.findMentionableUsers(Number(groupId), query);
}

async function getMentionableTasks(groupId, query = '') {
  if (!groupId) return [];
  return await DiscussionModel.findMentionableTasks(Number(groupId), query);
}

async function getMentionableTopics(groupId, query = '') {
  if (!groupId) return [];
  return await DiscussionModel.findMentionableTopics(Number(groupId), query);
}

async function getMentionableNotebooks(groupId, query = '') {
  if (!groupId) return [];
  return await DiscussionModel.findMentionableNotebooks(Number(groupId), query);
}

async function getMentionablePages(groupId, query = '', folderId = null) {
  if (!groupId) return [];
  return await DiscussionModel.findMentionablePages(Number(groupId), query, folderId);
}

async function getFolderPages(groupId, folderId) {
  if (!groupId || !folderId) return [];
  return await DiscussionModel.findPagesByFolder(Number(groupId), Number(folderId));
}

async function getMentionableFolders(groupId, query = '') {
  if (!groupId) return [];
  return await DiscussionModel.findMentionableFolders(Number(groupId), query);
}

async function deleteComment({ commentId, userId, userRole, groupId }) {
  const comment = await DiscussionModel.findCommentById(Number(commentId));
  if (!comment) {
    const err = new Error('Comment not found.');
    err.status = 404;
    throw err;
  }

  // If groupId is provided, verify comment belongs to a discussion in this workspace
  if (groupId && Number(comment.group_id) !== Number(groupId)) {
    const err = new Error('Comment does not belong to this workspace.');
    err.status = 404;
    throw err;
  }

  // Check role-based permission:
  // LEADER: Can delete ANY comment within their workspace group
  // MEMBER: Can delete ONLY comments authored by themselves (comment.user_id === userId)
  let isLeader = isAdminRole(userRole);
  if (!isLeader) {
    const memberRecord = await GroupModel.findMember(comment.group_id, userId);
    if (memberRecord && isAdminRole(memberRecord.role)) {
      isLeader = true;
    }
  }

  const isAuthor = Number(comment.user_id) === Number(userId);

  if (!isLeader && !isAuthor) {
    const err = new Error('Forbidden: You can only delete comments authored by yourself unless you are a workspace Leader.');
    err.status = 403;
    throw err;
  }

  await DiscussionModel.deleteComment(Number(commentId));
  return { success: true };
}

async function togglePinComment({ commentId, topicId, groupId, userId, userRole }) {
  let topic = null;
  if (topicId) {
    topic = await DiscussionModel.findByIdInGroup(Number(topicId), Number(groupId));
  }
  if (!topic) {
    const comment = await DiscussionModel.findCommentById(Number(commentId));
    if (comment) {
      topic = await DiscussionModel.findByIdInGroup(Number(comment.discussion_id), Number(groupId || comment.group_id));
    }
  }
  if (!topic) {
    const err = new Error('Discussion topic not found in this workspace.');
    err.status = 404;
    throw err;
  }

  // RESTRICTION: ONLY the Group Leader (role === 'leader' or 'co_leader') OR the original Thread Creator (author_user_id === currentUser.id)
  let isLeader = isAdminRole(userRole);
  if (!isLeader && (groupId || topic.group_id)) {
    const memberRecord = await GroupModel.findMember(groupId || topic.group_id, userId);
    if (memberRecord && isAdminRole(memberRecord.role)) {
      isLeader = true;
    }
  }

  const isThreadCreator = Number(topic.author_user_id) === Number(userId) || Number(topic.created_by) === Number(userId);

  if (!isLeader && !isThreadCreator) {
    const err = new Error('Forbidden: Only the Group Leader or the original Thread Creator can pin or unpin comments in discussions.');
    err.status = 403;
    throw err;
  }

  const updated = await DiscussionModel.togglePinComment(Number(commentId), Number(topic.id), Number(groupId || topic.group_id), Number(userId));
  if (!updated) {
    const err = new Error('Comment not found in this topic.');
    err.status = 404;
    throw err;
  }
  return updated;
}

module.exports = {
  normalizeAttachments,
  createTopic,
  getGroupTopics,
  getTopicDetails,
  postComment,
  deleteTopic,
  deleteComment,
  togglePinComment,
  getActivityFeed,
  getMentionableUsers,
  getMentionableTasks,
  getMentionableTopics,
  getMentionableNotebooks,
  getMentionablePages,
  getFolderPages,
  getMentionableFolders
};
