/**
 * Search Controller
 * Advanced search and filtering for tickets
 */

const Ticket = require('../models/Ticket');
const Department = require('../models/Department');
const User = require('../models/User');
const SLA = require('../models/SLA');

class SearchController {
  /**
   * GET /search
   * Display advanced search page
   */
  static async index(req, res) {
    try {
      const [departments] = await Department.getAll();
      const [agents] = await User.getByRole('agent');

      res.render('tickets/search', {
        title: 'Advanced Search',
        departments,
        agents,
        statuses: ['Open', 'In Progress', 'Waiting', 'Resolved', 'Closed', 'Escalated'],
        priorities: ['Low', 'Medium', 'High', 'Critical']
      });
    } catch (error) {
      console.error('Error loading search page:', error);
      res.status(500).json({ error: 'Failed to load search page' });
    }
  }

  /**
   * GET /api/search/tickets
   * Search tickets with advanced filters
   */
  static async apiSearchTickets(req, res) {
    try {
      const {
        search,
        status,
        priority,
        department_id,
        agent_id,
        customer_id,
        date_from,
        date_to,
        sla_status,
        sort_by = 'created_at',
        sort_order = 'DESC',
        page = 1,
        per_page = 20
      } = req.query;

      // Build filters object
      const filters = {};

      if (search) {
        filters.search = search;
      }

      if (status && status !== 'all') {
        filters.status = status;
      }

      if (priority && priority !== 'all') {
        filters.priority = priority;
      }

      if (department_id && department_id !== 'all') {
        filters.department_id = department_id;
      }

      if (agent_id && agent_id !== 'all') {
        filters.agent_id = agent_id;
      }

      if (customer_id) {
        filters.customer_id = customer_id;
      }

      // Get all tickets with filters
      let tickets = await Ticket.getAll(filters);

      // Apply date range filter
      if (date_from || date_to) {
        tickets = tickets.filter(ticket => {
          const createdDate = new Date(ticket.created_at);

          if (date_from) {
            const fromDate = new Date(date_from);
            if (createdDate < fromDate) return false;
          }

          if (date_to) {
            const toDate = new Date(date_to);
            toDate.setHours(23, 59, 59, 999);
            if (createdDate > toDate) return false;
          }

          return true;
        });
      }

      // Apply SLA status filter
      if (sla_status && sla_status !== 'all') {
        tickets = tickets.filter(ticket => {
          if (sla_status === 'breached') {
            return ticket.sla_response_breached === 1 || ticket.sla_resolution_breached === 1;
          } else if (sla_status === 'at_risk') {
            const now = new Date();
            const responseDue = new Date(ticket.sla_response_due);
            const resolutionDue = new Date(ticket.sla_resolution_due);
            const timeUntilResponse = (responseDue - now) / (1000 * 60 * 60);
            const timeUntilResolution = (resolutionDue - now) / (1000 * 60 * 60);

            // At risk if less than 20% time remaining
            return timeUntilResponse < (responseDue - new Date(ticket.created_at)) * 0.2 ||
                   timeUntilResolution < (resolutionDue - new Date(ticket.created_at)) * 0.2;
          } else if (sla_status === 'compliant') {
            return ticket.sla_response_breached === 0 && ticket.sla_resolution_breached === 0;
          }
          return true;
        });
      }

      // Apply sorting
      const sortMap = {
        'created_at': 'created_at',
        'priority': 'priority',
        'status': 'status',
        'updated_at': 'updated_at'
      };

      const sortField = sortMap[sort_by] || 'created_at';
      const sortDir = sort_order.toUpperCase() === 'ASC' ? 1 : -1;

      tickets.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        // Handle date comparison
        if (typeof aVal === 'string' && aVal.match(/^\d{4}-\d{2}-\d{2}/)) {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        // Handle priority comparison
        if (sortField === 'priority') {
          const priorityOrder = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
          aVal = priorityOrder[aVal] || 0;
          bVal = priorityOrder[bVal] || 0;
        }

        if (aVal < bVal) return -1 * sortDir;
        if (aVal > bVal) return 1 * sortDir;
        return 0;
      });

      // Apply pagination
      const offset = (parseInt(page) - 1) * parseInt(per_page);
      const paginatedTickets = tickets.slice(offset, offset + parseInt(per_page));
      const totalResults = tickets.length;

      res.json({
        success: true,
        tickets: paginatedTickets,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(per_page),
          total_results: totalResults,
          total_pages: Math.ceil(totalResults / parseInt(per_page))
        },
        filters: {
          search,
          status,
          priority,
          department_id,
          agent_id,
          date_from,
          date_to,
          sla_status,
          sort_by,
          sort_order
        }
      });
    } catch (error) {
      console.error('Error searching tickets:', error);
      res.status(500).json({ error: 'Failed to search tickets' });
    }
  }

  /**
   * GET /api/search/suggestions
   * Get search suggestions based on partial input
   */
  static async apiGetSuggestions(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.length < 2) {
        return res.json({ suggestions: [] });
      }

      // Get all tickets and filter by search term
      const tickets = await Ticket.getAll({ search: q });

      // Extract unique suggestions from tickets
      const suggestions = [];
      const seen = new Set();

      tickets.slice(0, 10).forEach(ticket => {
        // Suggest ticket IDs
        const idKey = `#${ticket.id}`;
        if (!seen.has(idKey)) {
          suggestions.push({
            type: 'ticket',
            label: `${idKey} - ${ticket.title}`,
            value: ticket.id
          });
          seen.add(idKey);
        }

        // Suggest customer names
        const custKey = `customer:${ticket.customer_name}`;
        if (!seen.has(custKey)) {
          suggestions.push({
            type: 'customer',
            label: `Customer: ${ticket.customer_name}`,
            value: ticket.customer_name
          });
          seen.add(custKey);
        }
      });

      res.json({ suggestions: suggestions.slice(0, 8) });
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      res.status(500).json({ error: 'Failed to get suggestions' });
    }
  }

  /**
   * GET /api/search/export
   * Export search results as CSV
   */
  static async apiExportResults(req, res) {
    try {
      const {
        search,
        status,
        priority,
        department_id,
        agent_id,
        customer_id,
        date_from,
        date_to,
        sla_status
      } = req.query;

      // Build filters - same as apiSearchTickets
      const filters = {};
      if (search) filters.search = search;
      if (status && status !== 'all') filters.status = status;
      if (priority && priority !== 'all') filters.priority = priority;
      if (department_id && department_id !== 'all') filters.department_id = department_id;
      if (agent_id && agent_id !== 'all') filters.agent_id = agent_id;
      if (customer_id) filters.customer_id = customer_id;

      let tickets = await Ticket.getAll(filters);

      // Apply date range filter
      if (date_from || date_to) {
        tickets = tickets.filter(ticket => {
          const createdDate = new Date(ticket.created_at);

          if (date_from) {
            const fromDate = new Date(date_from);
            if (createdDate < fromDate) return false;
          }

          if (date_to) {
            const toDate = new Date(date_to);
            toDate.setHours(23, 59, 59, 999);
            if (createdDate > toDate) return false;
          }

          return true;
        });
      }

      // Apply SLA status filter
      if (sla_status && sla_status !== 'all') {
        tickets = tickets.filter(ticket => {
          if (sla_status === 'breached') {
            return ticket.sla_response_breached === 1 || ticket.sla_resolution_breached === 1;
          } else if (sla_status === 'compliant') {
            return ticket.sla_response_breached === 0 && ticket.sla_resolution_breached === 0;
          }
          return true;
        });
      }

      // Generate CSV
      const headers = ['ID', 'Title', 'Customer', 'Agent', 'Status', 'Priority', 'Department', 'Created', 'SLA Response Due', 'SLA Resolution Due'];
      const rows = tickets.map(ticket => [
        ticket.id,
        `"${ticket.title.replace(/"/g, '""')}"`,
        ticket.customer_name || 'N/A',
        ticket.agent_name || 'Unassigned',
        ticket.status,
        ticket.priority,
        ticket.department_name,
        new Date(ticket.created_at).toLocaleString(),
        ticket.sla_response_due ? new Date(ticket.sla_response_due).toLocaleString() : 'N/A',
        ticket.sla_resolution_due ? new Date(ticket.sla_resolution_due).toLocaleString() : 'N/A'
      ]);

      // Build CSV content
      let csv = headers.join(',') + '\n';
      csv += rows.map(row => row.join(',')).join('\n');

      // Send as downloadable file
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="tickets_${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting search results:', error);
      res.status(500).json({ error: 'Failed to export results' });
    }
  }

  /**
   * GET /api/search/filters/options
   * Get available filter options (for dropdown population)
   */
  static async apiGetFilterOptions(req, res) {
    try {
      const [departments] = await Department.getAll();
      const [agents] = await User.getByRole('agent');

      res.json({
        departments: departments.map(d => ({ id: d.id, name: d.name })),
        agents: agents.map(a => ({ id: a.id, name: a.name })),
        statuses: ['Open', 'In Progress', 'Waiting', 'Resolved', 'Closed', 'Escalated'],
        priorities: ['Low', 'Medium', 'High', 'Critical'],
        sla_statuses: [
          { value: 'all', label: 'All' },
          { value: 'compliant', label: 'Compliant' },
          { value: 'at_risk', label: 'At Risk' },
          { value: 'breached', label: 'Breached' }
        ]
      });
    } catch (error) {
      console.error('Error getting filter options:', error);
      res.status(500).json({ error: 'Failed to get filter options' });
    }
  }
}

module.exports = SearchController;
