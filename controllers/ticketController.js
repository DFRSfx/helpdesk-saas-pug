/**
 * Ticket Controller
 * Handles all ticket-related operations (CRUD, messages, assignments, status updates)
 */

const Ticket = require('../models/Ticket');
const Department = require('../models/Department');
const User = require('../models/User');
const Audit = require('../models/Audit');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

class TicketController {
  /**
   * Show all tickets list with filters and pagination
   * GET /tickets
   * @query {string} status - Filter by status
   * @query {string} priority - Filter by priority
   * @query {number} page - Page number for pagination
   * @query {string} search - Search term
   */
  static async index(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(process.env.TICKETS_PER_PAGE) || 20;
      const offset = (page - 1) * limit;

      // Build filters based on user role
      const filters = {};
      
      if (req.session.userRole === 'customer') {
        filters.customer_id = req.session.userId;
      } else if (req.session.userRole === 'agent' && req.query.mine === 'true') {
        filters.assigned_agent_id = req.session.userId;
      }

      // Apply query filters
      if (req.query.status) filters.status = req.query.status;
      if (req.query.priority) filters.priority = req.query.priority;
      if (req.query.department) filters.department_id = req.query.department;
      if (req.query.search) filters.search = req.query.search;

      const { tickets, total } = await Ticket.findAll(filters, limit, offset);
      const departments = await Department.findAll(true);

      const totalPages = Math.ceil(total / limit);

      res.render('tickets/index', {
        title: 'Support Tickets',
        tickets,
        departments,
        currentPage: page,
        totalPages,
        total,
        filters: req.query,
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error fetching tickets:', error);
      req.flash('error', 'Error loading tickets');
      res.redirect('/dashboard');
    }
  }

  /**
   * Show create ticket form
   * GET /tickets/create
   */
  static async showCreate(req, res) {
    try {
      const departments = await Department.findAll(true);

      res.render('tickets/create', {
        title: 'Create New Ticket',
        departments,
        error: req.flash('error'),
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error showing create form:', error);
      req.flash('error', 'Error loading form');
      res.redirect('/tickets');
    }
  }

  /**
   * Handle ticket creation
   * POST /tickets/create
   * @body {string} subject - Ticket subject
   * @body {string} description - Ticket description
   * @body {string} priority - Ticket priority (low, medium, high, critical)
   * @body {number} department_id - Department ID
   * @body {string} category - Ticket category (optional)
   */
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/tickets/create');
      }

      const { subject, description, priority, department_id, category } = req.body;

      // Create ticket
      const ticket = await Ticket.create({
        subject,
        description,
        priority: priority || 'medium',
        customer_id: req.session.userId,
        department_id: department_id || null,
        category: category || null
      });

      // Log ticket creation
      await Audit.create({
        ticket_id: ticket.id,
        user_id: req.session.userId,
        action: 'created',
        entity_type: 'ticket',
        entity_id: ticket.id,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        description: `Ticket created: ${ticket.ticket_number}`
      });

      // Create notification for assigned agent if auto-assigned
      if (ticket.assigned_agent_id) {
        await Notification.create({
          user_id: ticket.assigned_agent_id,
          ticket_id: ticket.id,
          type: 'ticket_assigned',
          title: 'New Ticket Assigned',
          message: `Ticket #${ticket.ticket_number} has been assigned to you`,
          link: `/tickets/${ticket.id}`
        });
      }

      req.flash('success', `Ticket #${ticket.ticket_number} created successfully!`);
      res.redirect(`/tickets/${ticket.id}`);

    } catch (error) {
      console.error('Error creating ticket:', error);
      req.flash('error', 'Error creating ticket. Please try again.');
      res.redirect('/tickets/create');
    }
  }

  /**
   * Show single ticket details with messages and attachments
   * GET /tickets/:id
   * @param {number} id - Ticket ID
   */
  static async show(req, res) {
    try {
      const ticketId = req.params.id;
      const ticket = await Ticket.findById(ticketId);

      if (!ticket) {
        req.flash('error', 'Ticket not found');
        return res.redirect('/tickets');
      }

      // Check permissions
      if (req.session.userRole === 'customer' && ticket.customer_id !== req.session.userId) {
        req.flash('error', 'You do not have permission to view this ticket');
        return res.redirect('/tickets');
      }

      // Get messages (exclude internal notes for customers)
      const includeInternal = req.session.userRole !== 'customer';
      const messages = await Ticket.getMessages(ticketId, includeInternal);
      const attachments = await Ticket.getAttachments(ticketId);
      const auditLogs = await Audit.getByTicket(ticketId, 20);

      // Get available agents for assignment (agents/admins only)
      let agents = [];
      if (req.session.userRole !== 'customer' && ticket.department_id) {
        agents = await User.getAgentsByDepartment(ticket.department_id);
      }

      res.render('tickets/view', {
        title: `Ticket #${ticket.ticket_number}`,
        ticket,
        messages,
        attachments,
        auditLogs,
        agents,
        error: req.flash('error'),
        success: req.flash('success'),
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error fetching ticket:', error);
      req.flash('error', 'Error loading ticket');
      res.redirect('/tickets');
    }
  }

  /**
   * Show edit ticket form
   * GET /tickets/:id/edit
   * @param {number} id - Ticket ID
   * Restricted to agents and admins
   */
  static async showEdit(req, res) {
    try {
      const ticketId = req.params.id;
      const ticket = await Ticket.findById(ticketId);

      if (!ticket) {
        req.flash('error', 'Ticket not found');
        return res.redirect('/tickets');
      }

      const departments = await Department.findAll(true);

      res.render('tickets/edit', {
        title: `Edit Ticket #${ticket.ticket_number}`,
        ticket,
        departments,
        error: req.flash('error'),
        user: {
          id: req.session.userId,
          role: req.session.userRole,
          name: req.session.userName
        }
      });

    } catch (error) {
      console.error('Error showing edit form:', error);
      req.flash('error', 'Error loading ticket');
      res.redirect('/tickets');
    }
  }

  /**
   * Handle ticket update
   * POST /tickets/:id/edit
   * @param {number} id - Ticket ID
   * @body {string} subject - Updated subject
   * @body {string} description - Updated description
   * @body {string} priority - Updated priority
   * @body {number} department_id - Updated department
   * @body {string} category - Updated category
   */
  static async update(req, res) {
    try {
      const ticketId = req.params.id;
      const { subject, description, priority, department_id, category } = req.body;

      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        req.flash('error', 'Ticket not found');
        return res.redirect('/tickets');
      }

      // Update ticket
      const updateData = {
        subject,
        description,
        priority,
        department_id: department_id || null,
        category: category || null
      };

      await Ticket.update(ticketId, updateData, req.session.userId);

      // Log update
      await Audit.create({
        ticket_id: ticketId,
        user_id: req.session.userId,
        action: 'updated',
        entity_type: 'ticket',
        entity_id: ticketId,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        description: 'Ticket details updated'
      });

      req.flash('success', 'Ticket updated successfully');
      res.redirect(`/tickets/${ticketId}`);

    } catch (error) {
      console.error('Error updating ticket:', error);
      req.flash('error', 'Error updating ticket');
      res.redirect(`/tickets/${req.params.id}/edit`);
    }
  }

  /**
   * Add message/reply to ticket
   * POST /tickets/:id/reply
   * @param {number} id - Ticket ID
   * @body {string} message - Message content
   * @body {boolean} is_internal - Is internal note (agents only)
   */
  static async addMessage(req, res) {
    try {
      const ticketId = req.params.id;
      const { message, is_internal } = req.body;

      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check permissions
      if (req.session.userRole === 'customer' && ticket.customer_id !== req.session.userId) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Only agents/admins can create internal notes
      const isInternal = (req.session.userRole !== 'customer' && is_internal === 'true');

      await Ticket.addMessage(ticketId, req.session.userId, message, isInternal);

      // Update ticket status if customer replied and ticket was waiting
      if (req.session.userRole === 'customer' && ticket.status === 'waiting') {
        await Ticket.updateStatus(ticketId, 'in_progress', req.session.userId);
      }

      // Create notification for customer or agent
      const notifyUserId = req.session.userRole === 'customer' 
        ? ticket.assigned_agent_id 
        : ticket.customer_id;

      if (notifyUserId && !isInternal) {
        await Notification.create({
          user_id: notifyUserId,
          ticket_id: ticketId,
          type: 'new_message',
          title: 'New Message on Ticket',
          message: `New message on ticket #${ticket.ticket_number}`,
          link: `/tickets/${ticketId}`
        });
      }

      // Log message
      await Audit.create({
        ticket_id: ticketId,
        user_id: req.session.userId,
        action: isInternal ? 'internal_note_added' : 'message_added',
        entity_type: 'ticket_message',
        entity_id: ticketId,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        description: isInternal ? 'Internal note added' : 'Message added to ticket'
      });

      req.flash('success', 'Reply added successfully');
      res.redirect(`/tickets/${ticketId}`);

    } catch (error) {
      console.error('Error adding message:', error);
      req.flash('error', 'Error adding reply');
      res.redirect(`/tickets/${req.params.id}`);
    }
  }

  /**
   * Assign ticket to agent
   * POST /tickets/:id/assign
   * @param {number} id - Ticket ID
   * @body {number} agent_id - Agent ID to assign
   * Restricted to agents and admins
   */
  static async assign(req, res) {
    try {
      const ticketId = req.params.id;
      const { agent_id } = req.body;

      await Ticket.assign(ticketId, agent_id, req.session.userId);

      // Create notification for assigned agent
      await Notification.create({
        user_id: agent_id,
        ticket_id: ticketId,
        type: 'ticket_assigned',
        title: 'Ticket Assigned to You',
        message: `A ticket has been assigned to you`,
        link: `/tickets/${ticketId}`
      });

      req.flash('success', 'Ticket assigned successfully');
      res.redirect(`/tickets/${ticketId}`);

    } catch (error) {
      console.error('Error assigning ticket:', error);
      req.flash('error', 'Error assigning ticket');
      res.redirect(`/tickets/${req.params.id}`);
    }
  }

  /**
   * Update ticket status
   * POST /tickets/:id/status
   * @param {number} id - Ticket ID
   * @body {string} status - New status
   */
  static async updateStatus(req, res) {
    try {
      const ticketId = req.params.id;
      const { status } = req.body;

      await Ticket.updateStatus(ticketId, status, req.session.userId);

      req.flash('success', `Ticket status updated to ${status}`);
      res.redirect(`/tickets/${ticketId}`);

    } catch (error) {
      console.error('Error updating status:', error);
      req.flash('error', 'Error updating ticket status');
      res.redirect(`/tickets/${req.params.id}`);
    }
  }

  /**
   * Delete ticket
   * POST /tickets/:id/delete
   * @param {number} id - Ticket ID
   * Restricted to admins only
   */
  static async delete(req, res) {
    try {
      const ticketId = req.params.id;
      
      await Ticket.delete(ticketId);

      req.flash('success', 'Ticket deleted successfully');
      res.redirect('/tickets');

    } catch (error) {
      console.error('Error deleting ticket:', error);
      req.flash('error', 'Error deleting ticket');
      res.redirect(`/tickets/${req.params.id}`);
    }
  }
}

module.exports = TicketController;
