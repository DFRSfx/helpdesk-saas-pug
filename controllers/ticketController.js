const Ticket = require('../models/Ticket');
const Chat = require('../models/Chat');
const Department = require('../models/Department');
const User = require('../models/User');
const Audit = require('../models/Audit');
const notificationController = require('./notificationController');

// List all tickets (with filters and pagination)
exports.index = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 100; // Increased for Kanban view to show all tickets
    const offset = (page - 1) * limit;

    // Extract showEscalated parameter
    const showEscalated = req.query.showEscalated === 'true';

    const filters = {
      limit,
      offset,
      status: req.query.status,
      priority: req.query.priority,
      department_id: req.query.department,
      search: req.query.search
    };

    // Apply showEscalated filter
    if (showEscalated) {
      filters.status = 'Escalated';
    }

    // Apply role-based filtering
    if (res.locals.currentUser.role === 'customer') {
      filters.customer_id = res.locals.currentUser.id;
    } else if (res.locals.currentUser.role === 'agent') {
      if (req.query.assignedTo === 'me') {
        filters.agent_id = res.locals.currentUser.id;
      } else if (req.query.assignedTo === 'unassigned') {
        filters.unassigned = true;
      } else if (req.query.assignedTo) {
        filters.agent_id = req.query.assignedTo;
      }
    }

    const tickets = await Ticket.getAll(filters);
    const total = await Ticket.count(filters);
    const departments = await Department.getAll();
    
    // Get agents for filter dropdown
    let agents = [];
    if (res.locals.currentUser.role === 'admin' || res.locals.currentUser.role === 'agent') {
      agents = await User.getAll({ role: 'agent' });
    }

    const totalPages = Math.ceil(total / limit);

    // Get escalated count for badge (only when not in escalated view)
    let escalatedCount = 0;
    if (!showEscalated && (res.locals.currentUser.role === 'admin' || res.locals.currentUser.role === 'agent')) {
      const escalatedFilters = { ...filters };
      escalatedFilters.status = 'Escalated';
      delete escalatedFilters.limit;
      delete escalatedFilters.offset;
      escalatedCount = await Ticket.count(escalatedFilters);
    }

    // Determine view mode
    const viewMode = req.query.view || 'board';
    const viewTemplate = viewMode === 'list' ? 'tickets/index-list' : 'tickets/index';

    res.render(viewTemplate, {
      title: 'Tickets',
      tickets,
      departments,
      agents,
      currentPage: page,
      totalPages,
      search: req.query.search,
      priority: req.query.priority,
      departmentFilter: req.query.department,
      assignedTo: req.query.assignedTo,
      filters: req.query,
      showEscalated,
      escalatedCount,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: total,
        startItem: offset + 1,
        endItem: Math.min(offset + limit, total)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Customer/Agent portal - ticket selection and chat
exports.portal = async (req, res, next) => {
  try {
    let filters = {
      limit: 100,
      offset: 0
    };

    // Set up filters based on user role
    if (res.locals.currentUser.role === 'customer') {
      filters.customer_id = res.locals.currentUser.id;
    } else if (res.locals.currentUser.role === 'agent') {
      filters.agent_id = res.locals.currentUser.id;
    }
    // Admin sees all tickets (no filter)

    const tickets = await Ticket.getAll(filters);

    res.render('tickets/portal', {
      title: res.locals.currentUser.role === 'customer' ? 'Your Tickets' : 'Tickets',
      tickets,
      selectedTicketId: req.query.ticketId ? parseInt(req.query.ticketId) : null
    });
  } catch (error) {
    next(error);
  }
};

// Show create ticket form
exports.showCreate = async (req, res, next) => {
  try {
    const departments = await Department.getAll();

    res.render('tickets/create', {
      title: 'Create Ticket',
      departments
    });
  } catch (error) {
    next(error);
  }
};

// Handle create ticket
exports.create = async (req, res, next) => {
  try {
    const { title, description, department_id, priority } = req.body;

    const ticketData = {
      customer_id: res.locals.currentUser.id,
      department_id,
      priority,
      status: 'Open',
      title,
      description
    };

    // Auto-assign to agent with lowest workload (if admin creates ticket, they can manually assign)
    if (res.locals.currentUser.role !== 'admin') {
      try {
        const agent = await User.getAgentWithLowestWorkload(department_id);
        if (agent) {
          ticketData.agent_id = agent.id;
        } else {
          console.warn(`No agents found for department ${department_id}`);
        }
      } catch (error) {
        console.error('Error assigning agent:', error);
        // Continue without assignment if there's an error
      }
    }

    const ticketId = await Ticket.create(ticketData);

    // Log ticket creation
    await Audit.log({
      ticket_id: ticketId,
      user_id: res.locals.currentUser.id,
      action: 'ticket_created',
      new_value: `Status: Open, Priority: ${priority}`
    });

    // Emit socket event
    const io = req.app.get('io');
    io.emit('ticket:created', { id: ticketId, title });

    // If agent was assigned, notify them
    if (ticketData.agent_id) {
      io.emit('ticket:assigned', { id: ticketId, title, agentId: ticketData.agent_id });
      await Audit.log({
        ticket_id: ticketId,
        user_id: res.locals.currentUser.id,
        action: 'agent_assigned',
        new_value: `Agent ID: ${ticketData.agent_id}`
      });
      
      // Create notification for assigned agent
      await notificationController.notifyTicketAssigned(io, { id: ticketId, title }, ticketData.agent_id);
    }

    req.flash('success', 'Ticket created successfully');
    res.redirect(`/tickets/${ticketId}`);
  } catch (error) {
    next(error);
  }
};

// Show single ticket
exports.show = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      req.flash('error', 'Ticket not found');
      return res.redirect('/tickets');
    }

    // Check permissions
    if (res.locals.currentUser.role === 'customer' && ticket.customer_id !== res.locals.currentUser.id) {
      req.flash('error', 'You do not have permission to view this ticket');
      return res.redirect('/tickets');
    }

    if (res.locals.currentUser.role === 'agent' && ticket.agent_id !== res.locals.currentUser.id) {
      req.flash('error', 'You do not have permission to view this ticket');
      return res.redirect('/tickets');
    }

    // Redirect all users to portal
    return res.redirect(`/tickets/portal?ticketId=${ticketId}`);
  } catch (error) {
    next(error);
  }
};

// Show edit ticket form
exports.showEdit = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      req.flash('error', 'Ticket not found');
      return res.redirect('/tickets');
    }

    const departments = await Department.getAll();
    const agents = await User.getAll({ role: 'agent' });

    res.render('tickets/edit', {
      title: 'Edit Ticket',
      ticket,
      departments,
      agents
    });
  } catch (error) {
    next(error);
  }
};

// Handle update ticket
exports.update = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const oldTicket = await Ticket.findById(ticketId);

    if (!oldTicket) {
      req.flash('error', 'Ticket not found');
      return res.redirect('/tickets');
    }

    const { title, description, department_id, priority, status, agent_id } = req.body;

    // Normalize values for comparison
    const normalizedStatus = status?.toLowerCase().trim();
    const normalizedPriority = priority?.toLowerCase().trim();
    const normalizedOldStatus = oldTicket.status?.toLowerCase().trim();
    const normalizedOldPriority = oldTicket.priority?.toLowerCase().trim();
    const newAgentId = agent_id ? parseInt(agent_id) : null;
    const oldAgentId = oldTicket.agent_id ? parseInt(oldTicket.agent_id) : null;

    // Check if there are any actual changes
    const hasChanges =
      normalizedStatus !== normalizedOldStatus ||
      normalizedPriority !== normalizedOldPriority ||
      newAgentId !== oldAgentId ||
      title?.trim() !== oldTicket.title?.trim() ||
      description?.trim() !== oldTicket.description?.trim() ||
      parseInt(department_id) !== parseInt(oldTicket.department_id);

    if (!hasChanges) {
      req.flash('info', 'No changes were made to the ticket');
      return res.redirect(`/tickets/${ticketId}`);
    }

    await Ticket.update(ticketId, {
      title,
      description,
      department_id,
      priority,
      status,
      agent_id: newAgentId
    });

    // Log changes only if values actually changed
    if (normalizedStatus !== normalizedOldStatus) {
      await Audit.log({
        ticket_id: ticketId,
        user_id: res.locals.currentUser.id,
        action: 'status_changed',
        old_value: oldTicket.status,
        new_value: status
      });
      
      // Notify customer of status change
      await notificationController.notifyStatusChange(io, { id: ticketId, title }, status, oldTicket.customer_id);
      
      // If escalated, notify admins
      if (normalizedStatus === 'escalated') {
        const admins = await User.getAll({ role: 'admin' });
        const adminIds = admins.map(admin => admin.id);
        await notificationController.notifyEscalation(io, { id: ticketId, title }, adminIds);
      }
    }

    if (normalizedPriority !== normalizedOldPriority) {
      await Audit.log({
        ticket_id: ticketId,
        user_id: res.locals.currentUser.id,
        action: 'priority_changed',
        old_value: oldTicket.priority,
        new_value: priority
      });
    }

    if (newAgentId !== oldAgentId) {
      await Audit.log({
        ticket_id: ticketId,
        user_id: res.locals.currentUser.id,
        action: 'agent_assigned',
        old_value: oldTicket.agent_id ? `Agent ID: ${oldTicket.agent_id}` : 'None',
        new_value: newAgentId ? `Agent ID: ${newAgentId}` : 'None'
      });

      // Emit socket event and notify new agent if assigned
      if (newAgentId) {
        const io = req.app.get('io');
        io.emit('ticket:assigned', { id: ticketId, title, agentId: newAgentId });
        
        // Create notification for newly assigned agent
        await notificationController.notifyTicketAssigned(io, { id: ticketId, title }, newAgentId);
      }
    }

    if (parseInt(department_id) !== parseInt(oldTicket.department_id)) {
      await Audit.log({
        ticket_id: ticketId,
        user_id: res.locals.currentUser.id,
        action: 'department_changed',
        old_value: oldTicket.department_name || 'None',
        new_value: department_id
      });
    }

    // Emit update event
    const io = req.app.get('io');
    io.emit('ticket:updated', { id: ticketId, title });

    req.flash('success', 'Ticket updated successfully');
    res.redirect(`/tickets/${ticketId}`);
  } catch (error) {
    next(error);
  }
};

// Add message to ticket
exports.addMessage = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const { message } = req.body;

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      req.flash('error', 'Ticket not found');
      return res.redirect('/tickets');
    }

    // Get or create chat conversation for this ticket
    const conversationId = await Chat.getOrCreateTicketConversation(ticketId, ticket.customer_id);

    // Ensure user is a participant
    await Chat.addParticipant(conversationId, res.locals.currentUser.id);

    // Add message to conversation
    const messageId = await Chat.addMessage({
      conversation_id: conversationId,
      sender_id: res.locals.currentUser.id,
      message
    });

    await Audit.log({
      ticket_id: ticketId,
      user_id: res.locals.currentUser.id,
      action: 'message_added',
      new_value: 'Chat message'
    });

    // Emit socket event
    const io = req.app.get('io');
    io.emit('message:new', { ticketId, ticketTitle: ticket.title });

    req.flash('success', 'Message added successfully');
    res.redirect(`/tickets/${ticketId}`);

    req.flash('success', 'Message added successfully');
    res.redirect(`/tickets/${ticketId}`);
  } catch (error) {
    next(error);
  }
};

// Add attachment to ticket
exports.addAttachment = async (req, res, next) => {
  try {
    const ticketId = req.params.id;

    if (!req.file) {
      req.flash('error', 'No file uploaded');
      return res.redirect(`/tickets/${ticketId}`);
    }

    await Ticket.addAttachment({
      ticket_id: ticketId,
      file_path: req.file.filename,
      uploaded_by: res.locals.currentUser.id
    });

    await Audit.log({
      ticket_id: ticketId,
      user_id: res.locals.currentUser.id,
      action: 'attachment_added',
      new_value: req.file.originalname
    });

    req.flash('success', 'File uploaded successfully');
    res.redirect(`/tickets/${ticketId}`);
  } catch (error) {
    next(error);
  }
};

// Delete ticket (admin only)
exports.delete = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    await Ticket.delete(ticketId);

    req.flash('success', 'Ticket deleted successfully');
    res.redirect('/tickets');
  } catch (error) {
    next(error);
  }
};
