/**
 * Calendar Event Controller
 */
const EventModel = require('./event.model');
const TaskModel = require('../tasks/task.model');
const { HTTP_STATUS } = require('../../config/constants');

async function getEvents(req, res) {
  try {
    const { groupId } = req.params;
    const { year, month } = req.query;

    let events;
    if (year && month) {
      events = await EventModel.findByGroupAndMonth(groupId, Number(year), Number(month));
    } else {
      events = await EventModel.findByGroup(groupId);
    }

    // Also pull tasks with due dates and merge them as calendar items
    const tasks = await TaskModel.findByGroup(groupId);
    const taskEvents = tasks
      .filter(t => t.due_date)
      .map(t => ({
        id: `task-${t.id}`,
        title: t.title,
        event_date: t.due_date,
        event_type: 'TASK',
        color: t.status === 'DONE' ? '#10b981' : t.priority === 'HIGH' ? '#ef4444' : '#f59e0b',
        creator_name: t.creator_name,
        is_task: true,
        task_status: t.status,
        task_priority: t.priority
      }));

    const allEvents = [
      ...events.map(e => ({ ...e, is_task: false })),
      ...taskEvents
    ].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

    return res.status(HTTP_STATUS.OK).json({ success: true, data: allEvents });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
}

async function createEvent(req, res) {
  try {
    const { groupId } = req.params;
    const { title, description, eventDate, eventType, color } = req.body;

    if (!title || !eventDate) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Title and date are required.' });
    }

    const id = await EventModel.create({
      groupId,
      title,
      description,
      eventDate,
      eventType,
      color,
      createdByUserId: req.user.id
    });

    const event = await EventModel.findById(id);
    return res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Event created!', data: event });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
}

async function deleteEvent(req, res) {
  try {
    const { eventId } = req.params;
    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Event not found.' });
    }

    // Only creator or group leader can delete
    if (event.created_by_user_id !== req.user.id && req.membership.role !== 'LEADER') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: 'Not authorized to delete this event.' });
    }

    await EventModel.delete(eventId);
    return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Event deleted.' });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
  }
}

module.exports = { getEvents, createEvent, deleteEvent };
