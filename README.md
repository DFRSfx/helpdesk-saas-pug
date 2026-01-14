# Zolentra - Professional SaaS Helpdesk Platform

![Zolentra](https://img.shields.io/badge/Zolentra-Helpdesk-blue)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

A modern, professional helpdesk and ticketing system built with Node.js, Express, and MySQL. Designed for businesses that need efficient customer support management with role-based access control, real-time updates, and comprehensive audit trails.

## 🌟 Features

### Core Functionality
- **Multi-Role System**: Admin, Agent, and Customer roles with appropriate permissions
- **Ticket Management**: Create, assign, update, and track support tickets
- **Real-time Chat Portal**: Unified portal for customers and agents to communicate on tickets
- **Real-time Message Sync**: Socket.io integration for instant message updates across all connected users
- **Department Management**: Organize tickets and agents by departments
- **Priority & Status Tracking**: Multiple priority levels (Low, Medium, High, Critical) and status states (Open, In Progress, Waiting, Escalated, Resolved, Closed)

### Advanced Features
- **Audit Logging**: Complete trail of all ticket changes and actions
- **File Attachments**: Upload and manage files on tickets
- **Internal Notes**: Private agent-only notes on tickets
- **Real-time Notifications**: Socket.io-powered notification system for ticket events
- **Notification Preferences**: Customizable email and in-app notifications
- **Dashboard Analytics**: Visual insights with Chart.js integration for admins and agents
- **Email Notifications**: Nodemailer integration for ticket updates and system events
- **Markdown Support**: Rich text formatting with marked.js in messages
- **User Management**: Full CRUD operations for users and permissions
- **Portal Chat Interface**: Customers and agents use the same intuitive chat-based interface
- **Notification Events**: Track chat messages, ticket assignments, status changes, and escalations

### Security & Performance
- **bcrypt Password Hashing**: Secure password storage
- **Session Management**: Express sessions with flash messages
- **Input Validation**: Express-validator for data sanitization
- **Indexed Database**: Optimized MySQL schema with strategic indexes
- **Database Views**: Pre-aggregated analytics for fast reporting

## 🚀 Tech Stack

**Backend**:
- Node.js & Express.js
- MySQL 8.0+ (with mysql2 driver)
- Socket.io for real-time features
- Express Sessions for authentication
- bcrypt for password hashing

**Frontend**:
- Pug (Jade) templating engine
- TailwindCSS for styling
- Chart.js for analytics visualization
- Vanilla JavaScript for interactivity

**Additional Libraries**:
- Multer for file uploads
- Express-validator for input validation
- Nodemailer for email notifications
- date-fns for date manipulation
- uuid for unique identifiers
- marked for Markdown rendering

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18.x or higher)
- **MySQL** (v8.0 or higher)
- **npm** or **yarn** package manager
- **Git** (optional, for cloning)

## ⚙️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/DFRSfx/helpdesk-saas-pug.git
cd helpdesk-saas-pug
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory by copying the example:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=zolentra_db
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=development

# Session Secret (IMPORTANT: Change this in production!)
SESSION_SECRET=zolentra-secret-key-change-in-production-please

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=support@zolentra.com
SMTP_PASS=your-email-app-password

# Application Branding
APP_NAME=Zolentra
APP_URL=http://localhost:3000
```

### 4. Set Up the Database

1. Log into MySQL:
```bash
mysql -u root -p
```

2. Run the database schema:
```sql
SOURCE database.sql;
```

3. (Optional) Load sample data:
```sql
SOURCE database_sample_data.sql;
```

### 5. Build TailwindCSS
In a separate terminal, run:
```bash
npm run build:css
```

This will watch for changes and compile your Tailwind styles.

### 6. Start the Application

**Development Mode** (with auto-restart):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 📂 Project Structure

```
mini-zendesk-redo/
├── app.js                      # Main application entry point
├── package.json                # Node.js dependencies and scripts
├── .env                        # Environment configuration (not in repo)
├── .env.example               # Example environment configuration
│
├── config/
│   └── database.js            # MySQL connection configuration
│
├── models/                    # Database models and queries
│   ├── User.js
│   ├── Ticket.js
│   ├── Department.js
│   └── ...
│
├── controllers/               # Business logic and route handlers
│   ├── authController.js
│   ├── ticketController.js
│   ├── userController.js
│   └── ...
│
├── routes/                    # Express route definitions
│   ├── auth.js               # Authentication routes
│   ├── tickets.js            # Ticket management routes
│   ├── users.js              # User management routes
│   ├── departments.js        # Department management routes
│   ├── dashboard.js          # Dashboard and analytics
│   ├── audit.js              # Audit log routes
│   └── api.js                # API endpoints
│
├── middlewares/              # Custom Express middleware
│   ├── auth.js               # Authentication middleware
│   ├── errorHandler.js       # Error handling
│   └── locals.js             # View local variables
│
├── views/                    # Pug templates
│   ├── layout/               # Layout templates
│   ├── partials/             # Reusable components
│   ├── auth/                 # Login, register pages
│   ├── tickets/              # Ticket views
│   ├── users/                # User management views
│   ├── dashboard/            # Dashboard views
│   ├── departments/          # Department views
│   ├── audit/                # Audit log views
│   ├── errors/               # Error pages (404, etc.)
│   └── landing/              # Public landing page
│
├── public/                   # Static assets
│   ├── css/                  # Compiled CSS
│   ├── js/                   # Client-side JavaScript
│   └── images/               # Images and icons
│
├── uploads/                  # User-uploaded files
├── database.sql             # Database schema
```

## 🗄️ Database Schema

### Core Tables
- **users**: Store user accounts (admin, agent, customer)
- **departments**: Organize tickets and agents
- **tickets**: Main ticket records
- **ticket_messages**: Conversation threads on tickets
- **ticket_attachments**: File uploads
- **audit_log**: Complete history of changes

### Database Views (Pre-aggregated Analytics)
- `v_ticket_overview_daily`: Daily ticket statistics
- `v_tickets_by_department`: Department performance metrics
- `v_agent_performance`: Individual agent statistics
- `v_ticket_message_activity`: Ticket activity tracking
- `v_audit_summary`: Quick audit insights

## 👥 User Roles

### Admin
- Full system access
- User management (create, edit, delete users)
- Department management
- System configuration
- View all tickets and audit logs
- Analytics and reporting for all departments
- Can edit, assign, and manage all tickets
- Access to agent dashboard with comprehensive statistics

### Agent
- View and manage assigned tickets
- Create internal notes (visible only to agents/admins)
- Update ticket status and priority
- Assign tickets to self or other agents
- View department-specific tickets
- Access to agent dashboard with personal statistics
- Edit and manage tickets in their departments
- Chat with customers through unified portal
- Receive real-time notifications for ticket events
- Customize notification preferences

### Customer
- Create new support tickets
- View own tickets via unified portal
- Real-time chat communication with agents
- Add messages and attachments to tickets
- Upload file attachments to tickets
- Receive email notifications for ticket updates
- View ticket status and priority in real-time
- Customize notification preferences
- Cannot edit ticket details (agents/admins only)

## 🔐 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Secure HTTP-only cookies
- **Input Validation**: Server-side validation on all inputs
- **SQL Injection Prevention**: Parameterized queries
- **File Upload Security**: Type and size validation
- **Role-Based Access Control**: Middleware-enforced permissions
- **XSS Protection**: Express built-in protections + Pug escaping

## 📊 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - New user registration
- `GET /auth/logout` - User logout

### Tickets & Portal
- `GET /tickets` - List tickets (admin/agent) or customer's tickets
- `GET /tickets/portal` - Unified portal view for customers and agents
- `POST /tickets` - Create new ticket (customers)
- `PUT /tickets/:id` - Update ticket (admin/agents only)
- `POST /tickets/:id/messages` - Add message to ticket
- `POST /tickets/:id/attachments` - Upload attachment
- `DELETE /tickets/:id/messages/:messageId` - Delete message (own messages or admin/agent)

### Real-time Events (Socket.io)
- `join-ticket-room` - Join real-time updates for a specific ticket
- `message:new` - Broadcast new message to ticket participants
- `ticket:updated` - Broadcast ticket changes
- `user:online` - Track user presence

### Notifications
- `GET /notifications` - List all notifications
- `GET /api/notifications` - Get notifications (JSON)
- `POST /notifications/preferences` - Update notification preferences
- `PUT /notifications/:id/read` - Mark notification as read

### Users (Admin only)
- `GET /users` - List users
- `GET /users/:id` - View user details
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `GET /users/profile` - View current user profile

### Departments (Admin only)
- `GET /departments` - List departments
- `POST /departments` - Create department
- `PUT /departments/:id` - Update department
- `DELETE /departments/:id` - Delete department
- `GET /departments/:id/stats` - Department statistics

### Dashboard
- `GET /dashboard` - Main dashboard with analytics
- `GET /dashboard/stats` - Get statistics (JSON)

### Audit
- `GET /audit` - View audit logs
- `GET /audit/ticket/:id` - Ticket-specific audit trail

## 🎨 Customization

### Portal Interface
The unified portal (`/tickets/portal`) is used by both customers and agents:
- **Customers**: See only their own tickets and can communicate with assigned agents
- **Agents/Admins**: Can access and manage all tickets, with additional controls for editing, assigning, and status updates
- Real-time message synchronization ensures both parties see updates instantly
- File attachments are supported for both customers and agents

### Branding
Edit the following in `.env`:
- `APP_NAME`: Your company name
- `APP_URL`: Your domain

### Styling
TailwindCSS configuration is in `tailwind.config.js`. Customize:
- Colors
- Typography
- Spacing
- Components

### Email Templates
Email templates can be customized in the controllers where `nodemailer` is used.

## 🧪 Development

### Watch Mode
Run both the application and CSS compiler:
```bash
# Terminal 1 - Application
npm run dev

# Terminal 2 - CSS Compilation
npm run build:css
```

### Database Migrations
When updating the schema, modify `database.sql` and re-run:
```sql
SOURCE database.sql;
```

## 📈 Production Deployment

### Checklist
1. ✅ Set `NODE_ENV=production` in `.env`
2. ✅ Change `SESSION_SECRET` to a secure random string
3. ✅ Use strong database credentials
4. ✅ Set up SSL/TLS (HTTPS)
5. ✅ Configure production SMTP settings
6. ✅ Set up database backups
7. ✅ Configure reverse proxy (Nginx/Apache)
8. ✅ Set up process manager (PM2)
9. ✅ Enable firewall rules
10. ✅ Set up monitoring and logging

### Example PM2 Configuration
```bash
npm install -g pm2
pm2 start app.js --name zolentra
pm2 save
pm2 startup
```

### Nginx Reverse Proxy Example
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐛 Troubleshooting

### Database Connection Issues
- Verify MySQL is running: `systemctl status mysql`
- Check credentials in `.env`
- Ensure database exists: `SHOW DATABASES;`

### Port Already in Use
Change the port in `.env`:
```env
PORT=3001
```

### File Upload Issues
- Check `uploads/` directory exists and has write permissions
- Verify `multer` configuration in controllers

### Session Issues
- Clear browser cookies
- Restart the server
- Check `SESSION_SECRET` is set

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add YourFeature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Styled with [TailwindCSS](https://tailwindcss.com/)
- Charts powered by [Chart.js](https://www.chartjs.org/)
- Templating by [Pug](https://pugjs.org/)

## 📞 Support

For support, please:
- Open an issue on GitHub
- Contact the development team
- Check the documentation

## 🗺️ Roadmap

### ✅ Completed Features
- [x] Real-time Socket.io integration for live updates
- [x] Unified portal for customers and agents
- [x] Real-time message synchronization
- [x] Notification system with preferences
- [x] File attachment support
- [x] Internal agent notes
- [x] Role-based access control
- [x] Dashboard analytics

### 📋 In Progress
- [ ] Enhanced search and filtering
- [ ] Ticket templates

### 🔮 Planned Features
- [ ] Multi-language support (i18n)
- [ ] Advanced SLA (Service Level Agreement) tracking
- [ ] Knowledge base integration
- [ ] Customer satisfaction surveys
- [ ] Mobile responsive improvements
- [ ] REST API documentation (Swagger/OpenAPI)
- [ ] Webhook integrations
- [ ] Third-party app integrations (Slack, Teams)
- [ ] Custom field support
- [ ] Ticket merging and splitting

---

**Made with ❤️ by the Zolentra Team**
