project-root/
│
├─ package.json
├─ server.js                  # main entry
├─ .env                       # DB credentials, secrets
│
├─ /config
│   └─ db.js                  # MySQL connection
│
├─ /controllers
│   ├─ authController.js      # login, logout, registration
│   ├─ ticketController.js    # create/update/view tickets
│   ├─ departmentController.js
│   ├─ userController.js      # agent/customer management
│   ├─ dashboardController.js # analytics & dashboard data
│   └─ auditController.js     # audit log retrieval
│
├─ /models
│   ├─ User.js
│   ├─ Ticket.js
│   ├─ TicketMessage.js
│   ├─ Department.js
│   ├─ TicketAttachment.js
│   └─ AuditLog.js
│
├─ /routes
│   ├─ auth.js
│   ├─ tickets.js
│   ├─ departments.js
│   ├─ users.js
│   └─ dashboard.js
│
├─ /middlewares
│   ├─ authMiddleware.js      # protect routes, role checks
│   ├─ errorHandler.js
│   └─ uploadMiddleware.js    # multer config for attachments
│
├─ /views
│   ├─ layout.pug
│   ├─ partials/
│   │    ├─ navbar.pug
│   │    ├─ sidebar.pug
│   │    └─ flash_messages.pug
│   ├─ auth/
│   │    ├─ login.pug
│   │    └─ register.pug
│   ├─ tickets/
│   │    ├─ create.pug
│   │    ├─ edit.pug
│   │    └─ view.pug
│   ├─ dashboard/
│   │    └─ index.pug
│   └─ departments/
│        └─ list.pug
│
├─ /public
│   ├─ css/
│   ├─ js/
│   └─ images/
│
└─ /uploads                   # file uploads
