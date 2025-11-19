const Audit = require('../models/Audit');
const User = require('../models/User');

// List audit logs (admin only)
exports.index = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const filters = {
      limit,
      offset,
      ticket_id: req.query.ticket_id,
      user_id: req.query.user_id,
      action: req.query.action,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const logs = await Audit.getAll(filters);
    const total = await Audit.count(filters);
    const totalPages = Math.ceil(total / limit);

    // Get all users for filter dropdown
    const users = await User.getAll({});

    // Get statistics
    const db = require('../config/database');
    const [statsToday] = await db.query('SELECT COUNT(*) as count FROM audit_log WHERE DATE(created_at) = CURDATE()');
    const [statsWeek] = await db.query('SELECT COUNT(*) as count FROM audit_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    const [activeUsers] = await db.query('SELECT COUNT(DISTINCT user_id) as count FROM audit_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');

    const stats = {
      total: total,
      today: statsToday[0].count,
      thisWeek: statsWeek[0].count,
      activeUsers: activeUsers[0].count
    };

    res.render('audit/index', {
      title: 'Audit Logs',
      logs,
      users,
      stats,
      currentPage: page,
      totalPages,
      filters: req.query
    });
  } catch (error) {
    next(error);
  }
};

// Export audit logs to CSV (admin only)
exports.exportCSV = async (req, res, next) => {
  try {
    const filters = {
      ticket_id: req.query.ticket_id,
      user_id: req.query.user_id,
      action: req.query.action,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const logs = await Audit.getAll(filters);

    // Generate CSV
    let csv = 'ID,Ticket ID,Ticket Title,User,Action,Old Value,New Value,Created At\n';

    logs.forEach(log => {
      csv += `${log.id},${log.ticket_id},"${log.ticket_title || ''}","${log.user_name || 'System'}","${log.action}","${log.old_value || ''}","${log.new_value || ''}","${log.created_at}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
