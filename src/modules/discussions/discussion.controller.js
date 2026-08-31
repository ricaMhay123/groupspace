/**
 * Discussion & Activity Feed Controller
 */

const discussionService = require('./discussion.service');
const { HTTP_STATUS } = require('../../config/constants');

async function getTopics(req, res) {
  try {
    const topics = await discussionService.getGroupTopics(req.params.groupId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: topics
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
}

async function getTopicDetails(req, res) {
  try {
    const topic = await discussionService.getTopicDetails(req.params.topicId, req.params.groupId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: topic
    });
  } catch (error) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: error.message
    });
  }
}

async function createTopic(req, res) {
  try {
    const { title, category } = req.body;
    const topic = await discussionService.createTopic({
      groupId: req.params.groupId,
      title,
      category,
      authorUserId: req.user.id,
      authorName: req.user.full_name
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Discussion topic created.',
      data: topic
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function postComment(req, res) {
  try {
    const { content } = req.body;
    const comment = await discussionService.postComment({
      topicId: req.params.topicId,
      groupId: req.params.groupId,
      content,
      userId: req.user.id,
      userName: req.user.full_name
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Comment posted.',
      data: comment
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function removeTopic(req, res) {
  try {
    await discussionService.deleteTopic({
      topicId: req.params.topicId,
      groupId: req.params.groupId,
      userId: req.user.id,
      userRole: req.membership.role
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Topic deleted.'
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function getActivity(req, res) {
  try {
    const activity = await discussionService.getActivityFeed(req.params.groupId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: activity
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getTopics,
  getTopicDetails,
  createTopic,
  postComment,
  removeTopic,
  getActivity
};
