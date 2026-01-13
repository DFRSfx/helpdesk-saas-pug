/**
 * SLA Controller
 * Handles SLA policy management and SLA-related operations
 */

const SLA = require('../models/SLA');
const Ticket = require('../models/Ticket');
const Audit = require('../models/Audit');

/**
 * GET /sla
 * Display SLA management page (admin only)
 */
exports.index = async (req, res, next) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).render('errors/403', {
        title: 'Access Denied'
      });
    }

    const policies = await SLA.getAllPolicies();
    const stats = await SLA.getDashboardStats();

    res.render('sla/index', {
      title: 'SLA Management',
      policies,
      stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /sla/dashboard
 * Display SLA performance dashboard
 */
exports.dashboard = async (req, res, next) => {
  try {
    if (!res.locals.currentUser || res.locals.currentUser.role === 'customer') {
      return res.status(403).render('errors/403', {
        title: 'Access Denied'
      });
    }

    const stats = await SLA.getDashboardStats();
    const atRisk = await SLA.getTicketsAtRisk(2); // 2-hour warning threshold
    const complianceReport = await SLA.getComplianceReport({
      group_by: 'department',
      period_days: 30
    });

    res.render('sla/dashboard', {
      title: 'SLA Dashboard',
      stats,
      atRisk,
      complianceReport
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sla/policies
 * Create new SLA policy
 */
exports.apiCreatePolicy = async (req, res, next) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      name,
      priority,
      response_time_hours,
      resolution_time_hours
    } = req.body;

    if (!name || !priority || !response_time_hours || !resolution_time_hours) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const policyId = await SLA.createPolicy({
      name,
      priority,
      response_time_hours: parseInt(response_time_hours),
      resolution_time_hours: parseInt(resolution_time_hours)
    });

    // Audit log
    await Audit.log(req.session.userId, 'SLA Policy Created', {
      policy_id: policyId,
      priority,
      response_time_hours,
      resolution_time_hours
    });

    res.json({ success: true, policy_id: policyId });
  } catch (error) {
    if (error.message.includes('Duplicate entry')) {
      return res.status(400).json({ error: 'Priority already has an SLA policy' });
    }
    next(error);
  }
};

/**
 * PATCH /api/sla/policies/:id
 * Update SLA policy
 */
exports.apiUpdatePolicy = async (req, res, next) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const updates = req.body;

    // Verify policy exists
    const policy = await SLA.getPolicyById(id);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    await SLA.updatePolicy(id, updates);

    // Audit log
    await Audit.log(req.session.userId, 'SLA Policy Updated', {
      policy_id: id,
      changes: updates
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sla/ticket/:ticketId
 * Get SLA metrics for a ticket
 */
exports.apiGetTicketSLA = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    // Verify user has access to ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check permissions
    if (req.session.user.role === 'customer' && ticket.created_by !== req.session.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const metrics = await SLA.getTicketSLAMetrics(ticketId);
    if (!metrics) {
      return res.status(404).json({ error: 'Ticket SLA metrics not found' });
    }

    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sla/at-risk
 * Get tickets at risk of SLA breach
 */
exports.apiGetAtRiskTickets = async (req, res, next) => {
  try {
    if (req.session.user.role === 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { hours_warning = 2 } = req.query;
    const atRisk = await SLA.getTicketsAtRisk(parseInt(hours_warning));

    res.json(atRisk);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sla/compliance-report
 * Get SLA compliance report
 */
exports.apiGetComplianceReport = async (req, res, next) => {
  try {
    if (req.session.user.role === 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { group_by = 'department', period_days = 30 } = req.query;

    const report = await SLA.getComplianceReport({
      group_by,
      period_days: parseInt(period_days)
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sla/check-breaches
 * Check and update SLA breach status for all open tickets
 * This would typically be called by a cron job
 */
exports.apiCheckBreaches = async (req, res, next) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get all open tickets
    const [openTickets] = await require('../config/database').query(
      `SELECT id FROM tickets WHERE status NOT IN ('resolved', 'closed')`
    );

    let checkedCount = 0;
    let breachCount = 0;

    for (const ticket of openTickets) {
      const breaches = await SLA.checkBreaches(ticket.id);
      if (breaches.response_breached || breaches.resolution_breached) {
        breachCount++;
      }
      checkedCount++;
    }

    res.json({
      success: true,
      checked_tickets: checkedCount,
      breached_tickets: breachCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sla/dashboard-stats
 * Get SLA statistics for dashboard
 */
exports.apiGetDashboardStats = async (req, res, next) => {
  try {
    const { department_id = null } = req.query;

    const stats = await SLA.getDashboardStats({
      department_id: department_id ? parseInt(department_id) : null
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Initialize SLA for a new ticket
 * Called from ticketController when creating a ticket
 */
exports.initializeTicketSLA = async (ticketId, priority) => {
  try {
    await SLA.initializeSLA(ticketId, priority);
  } catch (error) {
    console.error('Error initializing SLA:', error);
    // Don't throw - SLA is optional
  }
};

/**
 * Helper: Record first response on a ticket
 * Called from ticketController when adding the first message
 */
exports.recordFirstResponse = async (ticketId) => {
  try {
    await SLA.recordFirstResponse(ticketId);
  } catch (error) {
    console.error('Error recording first response:', error);
    // Don't throw - SLA tracking is optional
  }
};

/**
 * Helper: Check and update breach status
 * Called from controllers when status changes
 */
exports.checkAndUpdateBreaches = async (ticketId) => {
  try {
    return await SLA.checkBreaches(ticketId);
  } catch (error) {
    console.error('Error checking breaches:', error);
    return { response_breached: false, resolution_breached: false };
  }
};
