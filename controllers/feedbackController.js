/**
 * Feedback Controller
 * Handles ticket feedback and satisfaction surveys
 */

const Feedback = require('../models/Feedback');
const Ticket = require('../models/Ticket');
const emailService = require('../services/emailService');
const Audit = require('../models/Audit');

/**
 * GET /feedback/survey/:ticketId
 * Display feedback survey for a ticket
 */
exports.getSurvey = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    // Get ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).render('errors/404', { title: 'Ticket Not Found' });
    }

    // Check if user can provide feedback (customer only)
    if (ticket.customer_id !== req.session.userId && req.session.user.role !== 'admin') {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }

    // Get existing feedback if any
    const existingFeedback = await Feedback.getByTicket(ticketId);

    res.render('feedback/survey', {
      title: `Feedback for Ticket #${ticketId}`,
      ticket,
      feedback: existingFeedback
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/feedback/submit
 * Submit ticket feedback
 */
exports.apiSubmitFeedback = async (req, res, next) => {
  try {
    const { ticket_id, rating, feedback_text } = req.body;

    if (!ticket_id || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get ticket
    const ticket = await Ticket.findById(ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check permission (customer only, or admin)
    if (ticket.customer_id !== req.session.userId && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Create feedback
    const feedbackId = await Feedback.create({
      ticket_id,
      rating: parseInt(rating),
      feedback_text: feedback_text || null
    });

    // Log audit
    await Audit.log(req.session.userId, 'feedback_submitted', {
      ticket_id,
      rating
    });

    res.json({
      success: true,
      feedback_id: feedbackId,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feedback/stats
 * Get feedback statistics (admin)
 */
exports.apiGetStats = async (req, res, next) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { department_id, period_days = 30 } = req.query;

    const stats = await Feedback.getStatistics({
      department_id: department_id ? parseInt(department_id) : null,
      period_days: parseInt(period_days)
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feedback/agent-ratings
 * Get feedback ratings per agent (admin)
 */
exports.apiGetAgentRatings = async (req, res, next) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { period_days = 30 } = req.query;

    const ratings = await Feedback.getAgentRatings({
      period_days: parseInt(period_days)
    });

    res.json(ratings);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feedback/pending
 * Get feedback requests pending response
 */
exports.apiGetPending = async (req, res, next) => {
  try {
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { limit = 20 } = req.query;

    const pending = await Feedback.getPendingFeedback(parseInt(limit));

    res.json(pending);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /feedback/report
 * Display feedback report (admin)
 */
exports.getFeedbackReport = async (req, res, next) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }

    const { period_days = 30 } = req.query;

    const stats = await Feedback.getStatistics({
      period_days: parseInt(period_days)
    });

    const agentRatings = await Feedback.getAgentRatings({
      period_days: parseInt(period_days)
    });

    const pending = await Feedback.getPendingFeedback(10);

    res.render('feedback/report', {
      title: 'Feedback Report',
      stats,
      agentRatings,
      pending,
      period_days: parseInt(period_days)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/feedback/request-survey
 * Manually request feedback for a ticket (admin)
 */
exports.apiRequestSurvey = async (req, res, next) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { ticket_id } = req.body;

    if (!ticket_id) {
      return res.status(400).json({ error: 'ticket_id is required' });
    }

    // Get ticket
    const ticket = await Ticket.findById(ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Mark feedback as requested
    await Feedback.requestFeedback(ticket_id);

    // Send feedback request email
    await emailService.sendFeedbackRequestEmail(
      ticket.customer_email,
      ticket.customer_name,
      ticket_id,
      ticket.title
    );

    // Log audit
    await Audit.log(req.session.userId, 'feedback_requested', {
      ticket_id
    });

    res.json({
      success: true,
      message: 'Feedback request sent to customer'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feedback/:ticketId
 * Get feedback for a specific ticket
 */
exports.apiGetFeedback = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const feedback = await Feedback.getByTicket(ticketId);

    if (!feedback) {
      return res.status(404).json({ error: 'No feedback found' });
    }

    res.json(feedback);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/feedback/:feedbackId
 * Delete feedback (admin only)
 */
exports.apiDeleteFeedback = async (req, res, next) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { feedbackId } = req.params;

    await Feedback.delete(feedbackId);

    // Log audit
    await Audit.log(req.session.userId, 'feedback_deleted', {
      feedback_id: feedbackId
    });

    res.json({ success: true, message: 'Feedback deleted' });
  } catch (error) {
    next(error);
  }
};
