/**
 * Dashboard Controller
 * Handles dashboard views and analytics for different user roles
 */

const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Department = require('../models/Department');
const Audit = require('../models/Audit');

class DashboardController {
  /**
   * Show main dashboard
   * GET /dashboard
   * Different views based on user role (admin, agent, customer)
   */
  static async index(req, res) {
    try {
      const userRole = req.session.userRole;

      switch (userRole) {
        case 'admin':
          return await DashboardController.adminDashboard(req, res);
        case 'agent':
          return await DashboardController.agentDashboard(req, res);
        case 'customer':
          return await DashboardController.customerDashboard(req, res);
        default:
          req.flash('error', 'Invalid user role');
          return res.redirect('/auth/login');
      }

    } catch (error) {
      console.error('Dashboard error:', error);
      req.flash('error', 'Error loading dashboard');
      res.redirect('/');
    }
  }

  /**
   * Admin Dashboard
   * Shows comprehensive system statistics and analytics
   */
  static async adminDashboard(req, res) {
    try {
      // Get overall ticket statistics
      const ticketStats = await Ticket.getStatistics();
      
      // Get user statistics
      const userStats = await User.getStatistics();
      
      // Get department statistics
      const departments = await Department.findAll(true);
      
      // Get recent activity
      const recentActivity = await Audit.getRecentActivity(15);
      
      // Get tickets by status for chart
      const { tickets: recentTickets } = await Ticket.findAll({}, 10, 0);

      // Calculate response time metrics
      // TODO: Implement SLA tracking and breach calculations

      res.render('dashboard/admin', {
        title: 'Admin Dashboard',
        ticketStats,
        userStats,
        departments,
        recentActivity,
        recentTickets,
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Admin dashboard error:', error);
      req.flash('error', 'Error loading dashboard');
      res.redirect('/');
    }
  }

  /**
   * Agent Dashboard
   * Shows agent's assigned tickets and performance metrics
   */
  static async agentDashboard(req, res) {
    try {
      const agentId = req.session.userId;

      // Get agent's ticket statistics
      const myTicketStats = await Ticket.getStatistics({ assigned_agent_id: agentId });
      
      // Get agent's assigned tickets
      const { tickets: myTickets } = await Ticket.findAll(
        { assigned_agent_id: agentId, status: ['open', 'in_progress', 'waiting'] },
        15,
        0
      );

      // Get unassigned tickets in agent's department
      const agent = await User.findById(agentId);
      let unassignedTickets = [];
      if (agent.department_id) {
        const result = await Ticket.findAll(
          { 
            department_id: agent.department_id, 
            assigned_agent_id: null,
            status: 'open'
          },
          10,
          0
        );
        unassignedTickets = result.tickets;
      }

      // Get recent activity on agent's tickets
      const recentActivity = await Audit.getByUser(agentId, 10);

      res.render('dashboard/agent', {
        title: 'Agent Dashboard',
        myTicketStats,
        myTickets,
        unassignedTickets,
        recentActivity,
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Agent dashboard error:', error);
      req.flash('error', 'Error loading dashboard');
      res.redirect('/');
    }
  }

  /**
   * Customer Dashboard
   * Shows customer's tickets and support information
   */
  static async customerDashboard(req, res) {
    try {
      const customerId = req.session.userId;

      // Get customer's ticket statistics
      const myTicketStats = await Ticket.getStatistics({ customer_id: customerId });

      // Get customer's tickets
      const { tickets: myTickets, total } = await Ticket.findAll(
        { customer_id: customerId },
        10,
        0
      );

      // Get departments for creating new tickets
      const departments = await Department.findAll(true);

      res.render('dashboard/customer', {
        title: 'My Dashboard',
        myTicketStats,
        myTickets,
        totalTickets: total,
        departments,
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Customer dashboard error:', error);
      req.flash('error', 'Error loading dashboard');
      res.redirect('/');
    }
  }

  /**
   * Get analytics data (API endpoint for charts)
   * GET /dashboard/analytics
   * @query {string} type - Analytics type (tickets_by_day, tickets_by_status, etc.)
   * @query {string} date_from - Start date
   * @query {string} date_to - End date
   */
  static async getAnalytics(req, res) {
    try {
      const { type, date_from, date_to } = req.query;

      let data = {};

      switch (type) {
        case 'tickets_by_day':
          // TODO: Implement tickets by day query
          data = await DashboardController.getTicketsByDay(date_from, date_to);
          break;
        
        case 'tickets_by_status':
          // TODO: Implement tickets by status query
          data = await DashboardController.getTicketsByStatus();
          break;
        
        case 'tickets_by_priority':
          // TODO: Implement tickets by priority query
          data = await DashboardController.getTicketsByPriority();
          break;
        
        case 'agent_performance':
          // TODO: Implement agent performance query
          data = await DashboardController.getAgentPerformance();
          break;
        
        default:
          return res.status(400).json({ error: 'Invalid analytics type' });
      }

      res.json(data);

    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: 'Error fetching analytics data' });
    }
  }

  /**
   * Helper: Get tickets by day for chart
   */
  static async getTicketsByDay(dateFrom, dateTo) {
    // TODO: Implement with SQL query
    return {
      labels: [],
      datasets: []
    };
  }

  /**
   * Helper: Get tickets by status for chart
   */
  static async getTicketsByStatus() {
    const stats = await Ticket.getStatistics();
    return {
      labels: ['Open', 'In Progress', 'Waiting', 'Escalated', 'Resolved', 'Closed'],
      data: [
        stats.open_tickets,
        stats.in_progress_tickets,
        stats.waiting_tickets,
        stats.escalated_tickets,
        stats.resolved_tickets,
        stats.closed_tickets
      ]
    };
  }

  /**
   * Helper: Get tickets by priority for chart
   */
  static async getTicketsByPriority() {
    const stats = await Ticket.getStatistics();
    return {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      data: [
        stats.critical_tickets,
        stats.high_tickets,
        stats.medium_tickets,
        stats.low_tickets
      ]
    };
  }

  /**
   * Helper: Get agent performance data
   */
  static async getAgentPerformance() {
    // TODO: Implement with v_agent_performance view
    return {
      agents: [],
      metrics: []
    };
  }
}

module.exports = DashboardController;
