# Mini-Zendesk Support System - Setup Guide

This is a complete customer support ticketing system built with Express.js, Pug, MySQL, and Tailwind CSS.

## Project Structure

```
mini-zendesk-redo/
├── app.js                 # Main Express application
├── package.json           # Dependencies
├── .env.example          # Environment variables template
├── database.sql          # Database schema
├── config/
│   └── database.js       # MySQL connection pool
├── controllers/          # Business logic
│   ├── authController.js
│   ├── ticketController.js
│   ├── userController.js
│   ├── departmentController.js
│   ├── dashboardController.js
│   └── auditController.js
├── models/              # Database models
│   ├── User.js
│   ├── Ticket.js
│   ├── Department.js
│   └── Audit.js
├── routes/              # Route definitions
│   ├── auth.js
│   ├── tickets.js
│   ├── users.js
│   ├── departments.js
│   ├── dashboard.js
│   └── audit.js
├── middlewares/         # Custom middleware
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   ├── locals.js
│   ├── uploadMiddleware.js
│   └── validation.js
├── views/              # Pug templates
│   ├── layout/
│   ├── partials/
│   ├── auth/
│   ├── tickets/
│   ├── users/
│   ├── departments/
│   ├── dashboard/
│   ├── audit/
│   └── errors/
├── public/             # Static files
│   ├── css/
│   │   ├── input.css   # Tailwind source
│   │   └── output.css  # Compiled CSS (generated)
│   └── js/
│       └── main.js
└── uploads/            # File uploads directory
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` and configure your database credentials:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=supportdesk
DB_PORT=3306

SESSION_SECRET=your_super_secret_key_here
```

### 3. Setup Database

Import the database schema:

```bash
mysql -u root -p < database.sql
```

This will create:
- Database: `supportdesk`
- Tables: users, departments, tickets, ticket_messages, ticket_attachments, audit_log
- Views: v_ticket_overview_daily, v_tickets_by_department, v_agent_performance, etc.
- Indexes for performance

### 4. Build Tailwind CSS

In one terminal, run:

```bash
npm run build:css
```

This will watch for changes and compile Tailwind CSS.

### 5. Start the Application

In another terminal:

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

The application will be available at `http://localhost:3000`

## Default User Setup

After setting up the database, you need to create users. Here's how to create an admin user manually:

```sql
USE supportdesk;

-- Create admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@supportdesk.com', '$2b$10$YOUR_BCRYPT_HASH_HERE', 'admin');

-- Create agent user (password: agent123)
INSERT INTO users (name, email, password_hash, role) VALUES
('Agent User', 'agent@supportdesk.com', '$2b$10$YOUR_BCRYPT_HASH_HERE', 'agent');

-- Create sample department
INSERT INTO departments (name) VALUES ('Technical Support');
```

Or use the registration page at `/auth/register` to create a customer account, then manually update the role to 'admin' in the database.

## Features

### Authentication
- Session-based authentication
- Password hashing with bcrypt
- Role-based access control (Admin, Agent, Customer)

### Tickets
- Create, view, edit, delete tickets
- Priority levels: Low, Medium, High, Critical
- Status workflow: Open → In Progress → Waiting → Escalated → Resolved → Closed
- Automatic agent assignment based on workload
- File attachments (images, PDF)
- Threaded messages (public and internal notes)

### Dashboards
- **Admin Dashboard**: Overall stats, department performance, agent metrics, escalations
- **Agent Dashboard**: My tickets, pending escalations
- **Customer Dashboard**: My tickets overview

### Departments
- Create and manage departments
- Department statistics
- Agent assignment to departments

### Users
- User management (admin only)
- Profile management
- Password change

### Audit Logs
- Complete audit trail for all ticket changes
- Filterable by user, action, date
- Export to CSV

### Real-time Features
- Socket.io integration for live updates
- Notifications for ticket assignments and new messages

### Analytics
- Ticket trends (Chart.js)
- Agent performance metrics
- Department statistics
- Auto-escalation for overdue tickets

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: Pug templates
- **Database**: MySQL
- **Styling**: Tailwind CSS
- **Real-time**: Socket.io
- **File Upload**: Multer
- **Authentication**: express-session, bcrypt
- **Validation**: express-validator
- **Charts**: Chart.js

## API Endpoints

### Authentication
- GET `/auth/login` - Login page
- POST `/auth/login` - Login submit
- GET `/auth/register` - Registration page
- POST `/auth/register` - Registration submit
- GET `/auth/logout` - Logout

### Tickets
- GET `/tickets` - List all tickets (filtered by role)
- GET `/tickets/create` - Create ticket form
- POST `/tickets/create` - Create ticket
- GET `/tickets/:id` - View ticket details
- GET `/tickets/:id/edit` - Edit ticket form (agent/admin)
- POST `/tickets/:id/edit` - Update ticket
- POST `/tickets/:id/message` - Add message
- POST `/tickets/:id/attachment` - Add attachment
- POST `/tickets/:id/delete` - Delete ticket (admin)

### Users
- GET `/users` - List users (admin)
- GET `/users/profile` - View my profile
- POST `/users/profile` - Update my profile
- POST `/users/profile/password` - Change password
- GET `/users/create` - Create user form (admin)
- POST `/users/create` - Create user (admin)
- GET `/users/:id/edit` - Edit user form (admin)
- POST `/users/:id/edit` - Update user (admin)
- POST `/users/:id/delete` - Delete user (admin)

### Departments
- GET `/departments` - List departments
- GET `/departments/stats` - Department statistics
- GET `/departments/create` - Create department (admin)
- POST `/departments/create` - Create department (admin)
- GET `/departments/:id/edit` - Edit department (admin)
- POST `/departments/:id/edit` - Update department (admin)
- POST `/departments/:id/delete` - Delete department (admin)

### Dashboard
- GET `/dashboard` - Main dashboard (role-based)

### Audit
- GET `/audit` - List audit logs (admin)
- GET `/audit/export` - Export logs to CSV (admin)

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- Role-based access control
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- File upload restrictions (type and size)
- CSRF protection (via sessions)

## Future Enhancements

- Email notifications (NodeMailer integration)
- SLA tracking and reporting
- Knowledge base
- Customer satisfaction ratings
- Multi-language support
- Advanced reporting and analytics
- Mobile app

## Troubleshooting

### Database Connection Issues
- Ensure MySQL is running
- Check database credentials in `.env`
- Verify database exists: `SHOW DATABASES;`

### Tailwind CSS not working
- Run `npm run build:css` to compile CSS
- Check that `public/css/output.css` exists

### File Upload Issues
- Ensure `uploads/` directory exists and is writable
- Check file size and type restrictions in `.env`

### Port Already in Use
- Change PORT in `.env` file
- Or stop the process using the port

## License

MIT

## Support

For issues or questions, please refer to the documentation or create an issue in the repository.
