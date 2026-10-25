/**
 * Discussion & Activity Feed Service
 * All discussions, replies, and mentions are strictly scoped to groupId.
 */

'use strict';

const DiscussionModel = require('./discussion.model');
const GroupModel = require('../groups/group.model');
const { ROLES } = require('../../config/constants');
const { sanitizeText } = require('../../utils/validation.util');

async function createTopic({ groupId, title, category, authorUserId, authorName }) {
  if (!groupId) {
    throw new Error('Workspace ID is required to create a topic.');
  }

  const cleanTitle = sanitizeText(title);
  if (!cleanTitle) {
    throw new Error('Topic title is required.');
  }

  const topicId = await DiscussionModel.createTopic({
    groupId: Number(groupId),
    title: cleanTitle,
    category: sanitizeText(category) || 'General',
    authorUserId
  });

  await GroupModel.logActivity({
    groupId: Number(groupId),
    userId: authorUserId,
    actionType: 'TOPIC_CREATED',
    description: `${authorName || 'A member'} created discussion topic: "${cleanTitle}".`
  });

  return await DiscussionModel.findByIdInGroup(topicId, Number(groupId));
}

async function getGroupTopics(groupId) {
  if (!groupId) return [];
  return await DiscussionModel.findByGroup(Number(groupId));
}

async function getTopicDetails(topicId, groupId) {
  const topic = await DiscussionModel.findByIdInGroup(Number(topicId), Number(groupId));
  if (!topic) {
    const err = new Error('Discussion topic not found in this workspace.');
    err.status = 404;
    throw err;
  }

  const comments = await DiscussionModel.getComments(Number(topicId), Number(groupId));
  return {
    ...topic,
    comments
  };
}

async function postComment({ topicId, groupId, content, userId, userName }) {
  const cleanContent = sanitizeText(content);
  if (!cleanContent) {
    throw new Error('Comment content cannot be empty.');
  }

  // 1. Ensure topic belongs explicitly to this groupId
  const topic = await DiscussionModel.findByIdInGroup(Number(topicId), Number(groupId));
  if (!topic) {
    const err = new Error('Topic not found in this workspace.');
    err.status = 404;
    throw err;
  }

  // 2. Insert comment
  const commentId = await DiscussionModel.addComment({
    discussionId: Number(topicId),
    userId,
    content: cleanContent
  });

  // 3. Process workspace-scoped @mentions
  try {
    const groupMembers = await DiscussionModel.findMentionableUsers(Number(groupId), '');
    const lowerContent = cleanContent.toLowerCase();

    // Check each enrolled member
    for (const member of groupMembers) {
      if (Number(member.id) === Number(userId)) continue; // Don't notify self

      const memberName = (member.name || '').toLowerCase();
      const firstName = memberName.split(' ')[0];
      const compactName = memberName.replace(/\s+/g, '');

      const isMentioned = lowerContent.includes(`@${memberName}`) ||
                          lowerContent.includes(`@${firstName}`) ||
                          lowerContent.includes(`@${compactName}`);

      if (isMentioned) {
        await DiscussionModel.addMention({
          groupId: Number(groupId),
          discussionId: Number(topicId),
          commentId,
          mentionedUserId: member.id,
          taskId: null,
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

    // 4. Process workspace-scoped #task mentions
    const groupTasks = await DiscussionModel.findMentionableTasks(Number(groupId), '');
    for (const task of groupTasks) {
      const isTaskReferenced = cleanContent.includes(`#${task.id}`) ||
                               (task.title && lowerContent.includes(`#${task.title.toLowerCase()}`));

      if (isTaskReferenced) {
        if (task.assigned_to_user_id && Number(task.assigned_to_user_id) !== Number(userId)) {
          await DiscussionModel.addMention({
            groupId: Number(groupId),
            discussionId: Number(topicId),
            commentId,
            mentionedUserId: task.assigned_to_user_id,
            taskId: task.id,
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

  if (topic.author_user_id !== userId && userRole !== ROLES.LEADER) {
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

module.exports = {
  createTopic,
  getGroupTopics,
  getTopicDetails,
  postComment,
  deleteTopic,
  getActivityFeed,
  getMentionableUsers,
  getMentionableTasks
};
