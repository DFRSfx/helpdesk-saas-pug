/**
 * Audit Controller
 * Handles audit log viewing and filtering
 */

const Audit = require('../models/Audit');
const Ticket = require('../models/Ticket');
const User = require('../models/User');

class AuditController {
  /**
   * Show audit logs with filters
   * GET /audit
   * @query {number} ticket_id - Filter by ticket
   * @query {number} user_id - Filter by user
   * @query {string} action - Filter by action
   * @query {string} date_from - Filter by start date
   * @query {string} date_to - Filter by end date
   * @query {number} page - Page number
   */
  static async index(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 50;
      const offset = (page - 1) * limit;

      const filters = {};
      if (req.query.ticket_id) filters.ticket_id = req.query.ticket_id;
      if (req.query.user_id) filters.user_id = req.query.user_id;
      if (req.query.action) filters.action = req.query.action;
      if (req.query.date_from) filters.date_from = req.query.date_from;
      if (req.query.date_to) filters.date_to = req.query.date_to;

      const { logs, total } = await Audit.findAll(filters, limit, offset);
      const totalPages = Math.ceil(total / limit);

      // Get statistics
      const stats = await Audit.getStatistics(filters);

      // Get all users for filter dropdown
      const users = await User.findAll({}, 100, 0);

      res.render('audit/index', {
        title: 'Audit Logs',
        logs,
        stats,
        users,
        currentPage: page,
        totalPages,
        total,
        filters: req.query,
        error: req.flash('error'),
        success: req.flash('success'),
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error fetching audit logs:', error);
      req.flash('error', 'Error loading audit logs');
      res.redirect('/dashboard');
    }
  }

  /**
   * Show audit log details
   * GET /audit/:id
   * @param {number} id - Audit log ID
   */
  static async show(req, res) {
    try {
      // This could show detailed information about a specific audit entry
      // For now, redirect to index
      res.redirect('/audit');

    } catch (error) {
      console.error('Error fetching audit log:', error);
      req.flash('error', 'Error loading audit log');
      res.redirect('/audit');
    }
  }

  /**
   * Export audit logs
   * GET /audit/export
   * @query {string} format - Export format (csv, json)
   * TODO: Implement export functionality
   */
  static async export(req, res) {
    try {
      const format = req.query.format || 'csv';
      
      // TODO: Implement CSV/JSON export
      req.flash('error', 'Export functionality coming soon');
      res.redirect('/audit');

    } catch (error) {
      console.error('Error exporting audit logs:', error);
      req.flash('error', 'Error exporting logs');
      res.redirect('/audit');
    }
  }
}

module.exports = AuditController;
