const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendWelcomeEmail(email, name, temporaryPassword) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Welcome to ${process.env.APP_NAME} - Your Account Created`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
                .credentials { background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb; font-family: monospace; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">Welcome to ${process.env.APP_NAME}!</h2>
                </div>
                <div class="content">
                  <p>Hello <strong>${name}</strong>,</p>

                  <p>Your account has been successfully created! Below are your login credentials:</p>

                  <div class="credentials">
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
                  </div>

                  <p><strong>⚠️ Important:</strong> Please change your password after your first login. Keep your credentials secure and do not share them with anyone.</p>

                  <p>You can now log in to your account using the credentials above.</p>

                  <a href="${process.env.APP_URL}" class="button">Access Your Account</a>

                  <div class="footer">
                    <p>If you did not create this account or have any questions, please contact our support team.</p>
                    <p>© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent:', info.response);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(email, resetLink) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Password Reset - ${process.env.APP_NAME}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">Password Reset Request</h2>
                </div>
                <div class="content">
                  <p>We received a request to reset your password for your ${process.env.APP_NAME} account.</p>

                  <p>Click the button below to reset your password:</p>

                  <a href="${resetLink}" class="button">Reset Password</a>

                  <p><strong>Note:</strong> This link will expire in 24 hours. If you did not request this reset, please ignore this email.</p>

                  <div class="footer">
                    <p>© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.response);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTicketNotificationEmail(email, ticketId, ticketTitle) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Ticket #${ticketId} Created - ${process.env.APP_NAME}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
                .ticket-info { background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #10b981; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">Ticket Created Successfully</h2>
                </div>
                <div class="content">
                  <p>Your support ticket has been created and is now being processed.</p>

                  <div class="ticket-info">
                    <p><strong>Ticket ID:</strong> #${ticketId}</p>
                    <p><strong>Title:</strong> ${ticketTitle}</p>
                  </div>

                  <p>You can view and manage your ticket by logging into your account.</p>

                  <a href="${process.env.APP_URL}/tickets/${ticketId}" class="button">View Ticket</a>

                  <div class="footer">
                    <p>© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Ticket notification email sent:', info.response);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending ticket notification email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Email 1: Ticket Assigned
   * Sent to agent when ticket is assigned
   */
  async sendTicketAssignedEmail(agentEmail, agentName, ticketId, ticketTitle, priority) {
    try {
      const priorityColor = {
        Critical: '#dc2626',
        High: '#ea580c',
        Medium: '#eab308',
        Low: '#16a34a'
      };

      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
        to: agentEmail,
        subject: `[${priority}] Ticket #${ticketId} Assigned to You`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
                .ticket-badge { display: inline-block; background: ${priorityColor[priority] || '#6b7280'}; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold; margin-right: 10px; }
                .ticket-info { background: white; padding: 15px; margin: 20px 0; border-left: 4px solid ${priorityColor[priority] || '#6b7280'}; border-radius: 3px; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">New Ticket Assignment</h2>
                </div>
                <div class="content">
                  <p>Hello <strong>${agentName}</strong>,</p>
                  <p>A new ticket has been assigned to you.</p>

                  <div class="ticket-info">
                    <p><span class="ticket-badge">${priority}</span><strong>Ticket #${ticketId}</strong></p>
                    <p><strong>Title:</strong> ${ticketTitle}</p>
                  </div>

                  <p>Please review and respond to this ticket as soon as possible.</p>

                  <a href="${process.env.APP_URL}/tickets/${ticketId}" class="button">View Ticket</a>

                  <div class="footer">
                    <p>© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending ticket assigned email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Email 2: New Message on Ticket
   * Sent when someone replies to a ticket
   */
  async sendNewMessageEmail(recipientEmail, recipientName, ticketId, ticketTitle, senderName, messagePreview) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `New Reply on Ticket #${ticketId}: ${ticketTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
                .message-box { background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb; border-radius: 3px; font-style: italic; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">New Reply on Your Ticket</h2>
                </div>
                <div class="content">
                  <p>Hello <strong>${recipientName}</strong>,</p>
                  <p><strong>${senderName}</strong> replied to ticket <strong>#${ticketId}</strong>.</p>

                  <div class="message-box">
                    <p>"${messagePreview.substring(0, 200)}${messagePreview.length > 200 ? '...' : ''}"</p>
                  </div>

                  <p>Click the button below to view the full conversation.</p>

                  <a href="${process.env.APP_URL}/tickets/${ticketId}" class="button">View Ticket</a>

                  <div class="footer">
                    <p>© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending new message email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Email 3: Ticket Status Changed
   * Sent when ticket status changes
   */
  async sendStatusChangeEmail(customerEmail, customerName, ticketId, ticketTitle, oldStatus, newStatus) {
    try {
      const statusColor = {
        Open: '#3b82f6',
        'In Progress': '#f59e0b',
        Waiting: '#8b5cf6',
        Escalated: '#ef4444',
        Resolved: '#10b981',
        Closed: '#6b7280'
      };

      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
        to: customerEmail,
        subject: `Ticket #${ticketId} Status Updated: ${newStatus}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
                .status-update { background: white; padding: 20px; margin: 20px 0; border-radius: 3px; border-left: 4px solid #2563eb; }
                .status-badge { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; margin: 0 5px; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">Ticket Status Update</h2>
                </div>
                <div class="content">
                  <p>Hello <strong>${customerName}</strong>,</p>

                  <div class="status-update">
                    <p><strong>Ticket #${ticketId}</strong></p>
                    <p><strong>Title:</strong> ${ticketTitle}</p>
                    <p style="margin-top: 15px;">
                      Status changed from
                      <span class="status-badge" style="background: ${statusColor[oldStatus] || '#6b7280'}">${oldStatus}</span>
                      to
                      <span class="status-badge" style="background: ${statusColor[newStatus] || '#6b7280'}">${newStatus}</span>
                    </p>
                  </div>

                  <p>You can view your ticket details using the link below.</p>

                  <a href="${process.env.APP_URL}/tickets/${ticketId}" class="button">View Ticket</a>

                  <div class="footer">
                    <p>© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending status change email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Email 4: Ticket Escalation
   * Sent when ticket is escalated
   */
  async sendEscalationEmail(managerEmails, ticketId, ticketTitle, priority, reason) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
        to: managerEmails.join(', '),
        subject: `⚠️ [ESCALATED] Ticket #${ticketId} Requires Attention`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; border: 2px solid #dc2626; }
                .escalation-info { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626; border-radius: 3px; }
                .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #fecaca; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">🚨 Ticket Escalation Alert</h2>
                </div>
                <div class="content">
                  <p><strong>An important ticket has been escalated and requires management attention.</strong></p>

                  <div class="escalation-info">
                    <p><strong>Ticket #${ticketId}</strong></p>
                    <p><strong>Title:</strong> ${ticketTitle}</p>
                    <p><strong>Priority:</strong> <span style="color: #dc2626; font-weight: bold;">${priority}</span></p>
                    <p><strong>Reason:</strong> ${reason}</p>
                  </div>

                  <p>Please review and take appropriate action immediately.</p>

                  <a href="${process.env.APP_URL}/tickets/${ticketId}" class="button">Review Ticket</a>

                  <div class="footer">
                    <p>© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending escalation email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Email 5: Feedback Request
   * Sent when ticket is resolved, requesting customer satisfaction feedback
   */
  async sendFeedbackRequestEmail(customerEmail, customerName, ticketId, ticketTitle) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
        to: customerEmail,
        subject: `How was your experience with Ticket #${ticketId}?`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #86efac; }
                .feedback-prompt { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; border-radius: 3px; text-align: center; }
                .stars { font-size: 32px; letter-spacing: 10px; margin: 15px 0; }
                .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #86efac; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">Thank You for Your Patience!</h2>
                </div>
                <div class="content">
                  <p>Hello <strong>${customerName}</strong>,</p>

                  <p>Your ticket <strong>#${ticketId}</strong> "<strong>${ticketTitle}</strong>" has been resolved.</p>

                  <div class="feedback-prompt">
                    <p><strong>We'd love to hear from you!</strong></p>
                    <p>How satisfied are you with the resolution?</p>
                    <div class="stars">⭐ ⭐ ⭐ ⭐ ⭐</div>
                    <p>Your feedback helps us improve our service quality.</p>
                  </div>

                  <p style="text-align: center;">
                    <a href="${process.env.APP_URL}/tickets/${ticketId}/feedback" class="button">Share Your Feedback</a>
                  </p>

                  <p style="text-align: center; color: #666; font-size: 12px;">
                    The survey takes less than a minute to complete.
                  </p>

                  <div class="footer">
                    <p>© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending feedback request email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
