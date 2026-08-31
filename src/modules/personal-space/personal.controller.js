/**
 * Personal Space Controller
 */

const personalService = require('./personal.service');
const { HTTP_STATUS } = require('../../config/constants');

async function getItems(req, res) {
  try {
    const groupId = req.query.groupId || req.query.group_id;
    const items = await personalService.getPersonalItems(req.user.id, req.query.type, groupId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: items
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message
    });
  }
}

async function create(req, res) {
  try {
    const { type, title, content, amount, category, dueDate, groupId, group_id } = req.body;
    const item = await personalService.addPersonalItem({
      userId: req.user.id,
      groupId: groupId || group_id,
      type,
      title,
      content,
      amount,
      category,
      dueDate
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Added to your personal space.',
      data: item
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function update(req, res) {
  try {
    const { title, content, status, amount, category } = req.body;
    const item = await personalService.updatePersonalItem({
      id: req.params.id,
      userId: req.user.id,
      title,
      content,
      status,
      amount,
      category
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Personal item updated.',
      data: item
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

async function remove(req, res) {
  try {
    await personalService.deletePersonalItem(req.params.id, req.user.id);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Item removed from your personal space.'
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getItems,
  create,
  update,
  remove
};
