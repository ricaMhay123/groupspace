/**
 * Discussion & Activity Feed Service
 */

const DiscussionModel = require('./discussion.model');
const GroupModel = require('../groups/group.model');
const { ROLES } = require('../../config/constants');
const { sanitizeText } = require('../../utils/validation.util');

async function createTopic({ groupId, title, category, authorUserId, authorName }) {
  const cleanTitle = sanitizeText(title);
  if (!cleanTitle) {
    throw new Error('Topic title is required.');
  }

  const topicId = await DiscussionModel.createTopic({
    groupId,
    title: cleanTitle,
    category: sanitizeText(category) || 'General',
    authorUserId
  });

  await GroupModel.logActivity({
    groupId,
    userId: authorUserId,
    actionType: 'TOPIC_CREATED',
    description: `${authorName || 'A member'} created discussion topic: "${cleanTitle}".`
  });

  return await DiscussionModel.findById(topicId);
}

async function getGroupTopics(groupId) {
  return await DiscussionModel.findByGroup(groupId);
}

async function getTopicDetails(topicId, groupId) {
  const topic = await DiscussionModel.findById(topicId);
  if (!topic || topic.group_id !== Number(groupId)) {
    throw new Error('Discussion topic not found in this workspace.');
  }

  const comments = await DiscussionModel.getComments(topicId);
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

  const topic = await DiscussionModel.findById(topicId);
  if (!topic || topic.group_id !== Number(groupId)) {
    throw new Error('Topic not found.');
  }

  const commentId = await DiscussionModel.addComment({
    discussionId: topicId,
    userId,
    content: cleanContent
  });

  await GroupModel.logActivity({
    groupId,
    userId,
    actionType: 'COMMENT_POSTED',
    description: `${userName || 'A member'} replied to topic: "${topic.title}".`
  });

  const comments = await DiscussionModel.getComments(topicId);
  return comments.find(c => c.id === commentId);
}

async function deleteTopic({ topicId, groupId, userId, userRole }) {
  const topic = await DiscussionModel.findById(topicId);
  if (!topic || topic.group_id !== Number(groupId)) {
    throw new Error('Topic not found.');
  }

  if (topic.author_user_id !== userId && userRole !== ROLES.LEADER) {
    throw new Error('Only the author or a workspace Leader can delete this topic.');
  }

  await DiscussionModel.deleteTopic(topicId);
  return { success: true };
}

async function getActivityFeed(groupId) {
  return await DiscussionModel.getActivityFeed(groupId, 30);
}

module.exports = {
  createTopic,
  getGroupTopics,
  getTopicDetails,
  postComment,
  deleteTopic,
  getActivityFeed
};
