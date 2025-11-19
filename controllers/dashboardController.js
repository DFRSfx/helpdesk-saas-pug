const Ticket = require('../models/Ticket');
const Department = require('../models/Department');
const User = require('../models/User');
const Audit = require('../models/Audit');
const db = require('../config/database');

// Main dashboard (role-based)
exports.index = async (req, res, next) => {
  try {
    const user = res.locals.currentUser;

    if (user.role === 'admin') {
      return exports.adminDashboard(req, res, next);
    } else if (user.role === 'agent') {
      return exports.agentDashboard(req, res, next);
    } else {
      return exports.customerDashboard(req, res, next);
    }
  } catch (error) {
    next(error);
  }
};

// Admin dashboard
exports.adminDashboard = async (req, res, next) => {
  try {
    // Get overall ticket stats
    const ticketStats = await Ticket.getStats();

    // Get department stats
    const departmentStats = await Department.getStats();

    // Get recent activity
    const recentActivity = await Audit.getRecentActivity(10);

    // Get ticket trend data (last 30 days)
    const [ticketTrend] = await db.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM tickets
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get agent performance with email
    const [agentPerformance] = await db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        COUNT(t.id) as assigned,
        SUM(CASE WHEN t.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN t.status = 'Closed' THEN 1 ELSE 0 END) as closed,
        1 as is_active
      FROM users u
      LEFT JOIN tickets t ON u.id = t.agent_id
      WHERE u.role = 'agent'
      GROUP BY u.id, u.name, u.email
      ORDER BY assigned DESC
      LIMIT 10
    `);

    // Get recent tickets
    const [recentTickets] = await db.query(`
      SELECT
        t.id,
        t.title as subject,
        t.status,
        t.priority,
        t.created_at,
        c.name as customer_name
      FROM tickets t
      LEFT JOIN users c ON t.customer_id = c.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `);

    // Get tickets needing escalation
    const needsEscalation = await Ticket.getTicketsNeedingEscalation();

    // Get resolved tickets today
    const [resolvedToday] = await db.query(`
      SELECT COUNT(*) as count
      FROM tickets
      WHERE status = 'Resolved' AND DATE(updated_at) = CURDATE()
    `);

    // Prepare stats for view
    const stats = {
      totalTickets: ticketStats.total || 0,
      openTickets: ticketStats.open || 0,
      inProgressTickets: ticketStats.in_progress || 0,
      resolvedTickets: ticketStats.resolved || 0,
      closedTickets: ticketStats.closed || 0,
      resolvedToday: resolvedToday[0].count || 0,
      lowPriority: ticketStats.low || 0,
      mediumPriority: ticketStats.medium || 0,
      highPriority: ticketStats.high || 0,
      urgentPriority: ticketStats.critical || 0
    };

    // Prepare chart data
    const chartData = {
      dates: ticketTrend.map(t => t.date),
      created: ticketTrend.map(t => t.count)
    };

    // Prepare department chart data
    const departmentChartData = {
      labels: departmentStats.map(d => d.name),
      data: departmentStats.map(d => d.total_tickets)
    };

    res.render('dashboard/admin', {
      title: 'Admin Dashboard',
      stats,
      chartData,
      departmentChartData,
      agentStats: agentPerformance,
      recentTickets,
      needsEscalation,
      departmentStats
    });
  } catch (error) {
    next(error);
  }
};

// Agent dashboard
exports.agentDashboard = async (req, res, next) => {
  try {
    const agentId = res.locals.currentUser.id;

    // Get my tickets
    const myTickets = await Ticket.getAll({
      agent_id: agentId,
      limit: 10
    });

    // Get my ticket stats
    const [myStatsRows] = await db.query(`
      SELECT
        COUNT(*) as myAssigned,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'Resolved' AND DATE(updated_at) = CURDATE() THEN 1 ELSE 0 END) as resolvedToday,
        SUM(CASE WHEN status = 'Escalated' THEN 1 ELSE 0 END) as escalations
      FROM tickets
      WHERE agent_id = ?
    `, [agentId]);

    // Get pending escalations
    const [pendingEscalations] = await db.query(`
      SELECT
        t.*,
        c.name as customer_name,
        d.name as department_name
      FROM tickets t
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.agent_id = ? AND t.status = 'Escalated'
      ORDER BY t.created_at ASC
    `, [agentId]);

    const stats = myStatsRows[0] || { myAssigned: 0, inProgress: 0, resolvedToday: 0, escalations: 0 };

    res.render('dashboard/agent', {
      title: 'Agent Dashboard',
      myTickets,
      stats,
      pendingEscalations
    });
  } catch (error) {
    next(error);
  }
};

// Customer dashboard
exports.customerDashboard = async (req, res, next) => {
  try {
    const customerId = res.locals.currentUser.id;

    // Get my tickets
    const myTickets = await Ticket.getAll({
      customer_id: customerId,
      limit: 10
    });

    // Get my ticket stats
    const [myStats] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed
      FROM tickets
      WHERE customer_id = ?
    `, [customerId]);

    res.render('dashboard/customer', {
      title: 'My Dashboard',
      myTickets,
      stats: myStats[0] || { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 }
    });
  } catch (error) {
    next(error);
  }
};
