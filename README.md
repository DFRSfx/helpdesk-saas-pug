# Mini-Zendesk Support System

A full-featured, enterprise-grade customer support ticketing system built with **Node.js**, **Express.js**, **Pug**, **MySQL**, and **Tailwind CSS**.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)
![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-orange)

## Features

### Core Functionality

- **Multi-Role Authentication**: Admin, Agent, and Customer roles with role-based access control
- **Ticket Management**: Full CRUD operations with priority levels and status workflow
- **Department System**: Organize tickets by departments with automatic agent assignment
- **Real-time Updates**: Socket.io integration for live notifications and ticket updates
- **File Attachments**: Secure file upload with validation (images, PDFs)
- **Threaded Messages**: Public and internal notes with Markdown support
- **Audit Logging**: Complete audit trail for all ticket changes
- **Advanced Analytics**: Dashboard with charts, metrics, and performance tracking

### Ticket Workflow

```
Open → In Progress → Waiting → Escalated → Resolved → Closed
```

- **Priority Levels**: Low, Medium, High, Critical
- **Auto-Escalation**: Automatic escalation for overdue tickets
- **Smart Assignment**: Load-balanced automatic agent assignment
- **Search & Filter**: Advanced search with multiple filters
- **Pagination**: Efficient handling of large datasets

### Dashboards

1. **Admin Dashboard**
   - Overall ticket statistics
   - Department performance metrics
   - Agent performance tracking
   - Ticket trend analysis with Chart.js
   - Escalation monitoring

2. **Agent Dashboard**
   - Personal ticket assignments
   - Pending escalations
   - Performance metrics
   - Quick actions

3. **Customer Dashboard**
   - My tickets overview
   - Status tracking
   - Easy ticket creation

## Tech Stack

### Backend
- **Node.js** v14+ with Express.js
- **MySQL** 8.0+ with connection pooling
- **Session-based authentication** with express-session
- **Password hashing** with bcrypt
- **Input validation** with express-validator
- **File uploads** with Multer

### Frontend
- **Pug** templating engine
- **Tailwind CSS** for styling
- **Chart.js** for data visualization
- **Socket.io** for real-time features
- **Marked.js** for Markdown rendering

### Security
- SQL injection prevention (parameterized queries)
- XSS protection
- CSRF protection
- Password hashing (bcrypt)
- File upload restrictions
- Role-based access control

## Quick Start

### Prerequisites

- Node.js 14+ ([Download](https://nodejs.org/))
- MySQL 8.0+ ([Download](https://dev.mysql.com/downloads/))
- npm or yarn

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/mini-zendesk-redo.git
cd mini-zendesk-redo
```

2. **Install dependencies**

```bash
npm install
```

3. **Setup environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=supportdesk
DB_PORT=3306

SESSION_SECRET=your_super_secret_key_change_in_production
```

4. **Setup database**

```bash
mysql -u root -p < database.sql
```

5. **Build Tailwind CSS**

```bash
npm run build:css
```

6. **Start the application**

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

7. **Access the application**

Open your browser and navigate to `http://localhost:3000`

## First-Time Setup

### Creating Your First Admin User

**Option 1: Using Registration (Recommended for development)**

1. Go to `http://localhost:3000/auth/register`
2. Register a new account
3. In MySQL, update the user's role:

```sql
USE supportdesk;
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

**Option 2: Direct SQL Insert**

```sql
USE supportdesk;

-- Create admin (password: admin123)
-- Generate hash: https://bcrypt-generator.com/ with 10 rounds
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@supportdesk.com', '$2b$10$YourBcryptHashHere', 'admin');

-- Create sample departments
INSERT INTO departments (name) VALUES
('Technical Support'),
('Billing'),
('Sales');
```

**Option 3: Use the setup script (create this file)**

Create `scripts/createAdmin.js`:

```javascript
require('dotenv').config();
const readline = require('readline');
const User = require('../models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdmin() {
  rl.question('Admin Name: ', (name) => {
    rl.question('Admin Email: ', (email) => {
      rl.question('Admin Password: ', async (password) => {
        try {
          await User.create({ name, email, password, role: 'admin' });
          console.log('Admin user created successfully!');
        } catch (error) {
          console.error('Error:', error.message);
        }
        rl.close();
        process.exit();
      });
    });
  });
}

createAdmin();
```

Then run: `node scripts/createAdmin.js`

## Project Structure

```
mini-zendesk-redo/
├── app.js                      # Main Express application
├── package.json                # Dependencies and scripts
├── database.sql                # Database schema
├── .env.example                # Environment template
├── SETUP_GUIDE.md              # Detailed setup guide
│
├── config/
│   └── database.js             # MySQL connection pool
│
├── controllers/                # Business logic
│   ├── authController.js       # Authentication
│   ├── ticketController.js     # Ticket management
│   ├── userController.js       # User management
│   ├── departmentController.js # Department management
│   ├── dashboardController.js  # Dashboard logic
│   └── auditController.js      # Audit logs
│
├── models/                     # Database models
│   ├── User.js                 # User model
│   ├── Ticket.js               # Ticket model
│   ├── Department.js           # Department model
│   └── Audit.js                # Audit model
│
├── routes/                     # Express routes
│   ├── auth.js                 # Auth routes
│   ├── tickets.js              # Ticket routes
│   ├── users.js                # User routes
│   ├── departments.js          # Department routes
│   ├── dashboard.js            # Dashboard routes
│   └── audit.js                # Audit routes
│
├── middlewares/                # Custom middleware
│   ├── authMiddleware.js       # Authentication & authorization
│   ├── errorHandler.js         # Global error handler
│   ├── locals.js               # Template locals
│   ├── uploadMiddleware.js     # File upload config
│   └── validation.js           # Input validation
│
├── views/                      # Pug templates
│   ├── layout/
│   │   └── layout.pug          # Main layout
│   ├── partials/
│   │   ├── navbar.pug          # Top navbar
│   │   ├── sidebar.pug         # Side navigation
│   │   └── flash_messages.pug  # Flash messages
│   ├── auth/
│   │   ├── login.pug           # Login page
│   │   └── register.pug        # Registration page
│   ├── tickets/
│   │   ├── index.pug           # Ticket list
│   │   ├── create.pug          # Create ticket
│   │   ├── view.pug            # View ticket
│   │   └── edit.pug            # Edit ticket
│   ├── dashboard/
│   │   ├── admin.pug           # Admin dashboard
│   │   ├── agent.pug           # Agent dashboard
│   │   └── customer.pug        # Customer dashboard
│   ├── users/
│   ├── departments/
│   ├── audit/
│   └── errors/
│       ├── 404.pug             # Not found
│       └── error.pug           # Error page
│
├── public/                     # Static assets
│   ├── css/
│   │   ├── input.css           # Tailwind source
│   │   └── output.css          # Compiled CSS
│   ├── js/
│   │   └── main.js             # Client-side JS
│   └── images/
│
└── uploads/                    # User uploads (gitignored)
```

## Database Schema

### Tables

- **users**: User accounts (admin, agent, customer)
- **departments**: Support departments
- **tickets**: Support tickets
- **ticket_messages**: Ticket messages and internal notes
- **ticket_attachments**: File attachments
- **audit_log**: Complete audit trail

### Views (for reporting)

- **v_ticket_overview_daily**: Daily ticket counts
- **v_tickets_by_department**: Department performance
- **v_agent_performance**: Agent metrics
- **v_ticket_message_activity**: Message activity
- **v_audit_summary**: Audit summary

## API Documentation

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for complete API endpoint documentation.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | MySQL host | localhost |
| `DB_USER` | MySQL user | root |
| `DB_PASSWORD` | MySQL password | - |
| `DB_NAME` | Database name | supportdesk |
| `DB_PORT` | MySQL port | 3306 |
| `SESSION_SECRET` | Session secret key | - |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 5242880 (5MB) |
| `ALLOWED_FILE_TYPES` | Allowed MIME types | image/jpeg,image/png,application/pdf |
| `ESCALATION_HOURS` | Hours before escalation | 24 |
| `CRITICAL_PRIORITY_ESCALATION_HOURS` | Critical priority escalation | 2 |
| `HIGH_PRIORITY_ESCALATION_HOURS` | High priority escalation | 6 |

## Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Build Tailwind CSS (watch mode)
npm run build:css

# Build Tailwind CSS (one-time)
npx tailwindcss -i ./public/css/input.css -o ./public/css/output.css --minify
```

## Development

### Adding New Features

1. **Model**: Create/update model in `models/`
2. **Controller**: Add business logic in `controllers/`
3. **Routes**: Define routes in `routes/`
4. **Views**: Create Pug templates in `views/`
5. **Middleware**: Add custom middleware if needed

### Code Style

- Use ES6+ features
- Follow MVC architecture
- Use async/await for async operations
- Parameterized queries for database access
- Validate all user input
- Log errors appropriately

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Ensure MySQL is running
- Check credentials in `.env`
- Verify database exists

**CSS Not Loading**
- Run `npm run build:css`
- Check `public/css/output.css` exists

**Port Already in Use**
- Change `PORT` in `.env`
- Kill process: `lsof -ti:3000 | xargs kill`

**File Upload Fails**
- Check `uploads/` directory exists and is writable
- Verify file size/type in `.env`

## Security

- All passwords are hashed using bcrypt (10 rounds)
- SQL injection prevention via parameterized queries
- XSS protection via Pug auto-escaping
- CSRF protection via session tokens
- File upload restrictions (type, size)
- Role-based access control
- Session security (httpOnly, secure in production)

## Performance

- MySQL connection pooling
- Efficient pagination
- Indexed database queries
- Minified CSS in production
- Gzip compression (add middleware)
- Static asset caching

## Production Deployment

### Recommended Setup

1. **Use environment variables for all config**
2. **Enable HTTPS** (use reverse proxy like Nginx)
3. **Set `NODE_ENV=production`**
4. **Use process manager** (PM2, systemd)
5. **Setup logging** (Winston, Morgan)
6. **Configure database backups**
7. **Enable gzip compression**
8. **Setup monitoring** (New Relic, Datadog)
9. **Configure email notifications** (NodeMailer)
10. **Use CDN for static assets**

### PM2 Example

```bash
npm install -g pm2
pm2 start app.js --name supportdesk
pm2 save
pm2 startup
```

## Testing

(To be implemented)

```bash
npm test                # Run all tests
npm run test:unit       # Unit tests
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Charts powered by [Chart.js](https://www.chartjs.org/)
- Icons from inline SVG

## Support

For issues, questions, or contributions:
- Create an issue on GitHub
- Contact: support@supportdesk.com
- Documentation: [SETUP_GUIDE.md](SETUP_GUIDE.md)

---

Made with ❤️ for enterprise-grade support ticket management
