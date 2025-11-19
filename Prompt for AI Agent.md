You are tasked with building a full-featured **Customer Support Ticketing System** using Node.js (Express) for the backend, Pug for templating, and MySQL as a **local database** (do not use Supabase or any cloud DB). Follow these instructions strictly:

1. **Roles & Permissions**
   - Users: Admin, Agent, Customer
   - Role-based route protection: Admin sees everything, Agents see assigned tickets, Customers see their own tickets.
   - Authentication: session-based or JWT with hashed passwords (bcrypt).

2. **Ticket Lifecycle**
   - Statuses: Open → In Progress → Waiting → Escalated → Resolved → Closed
   - Tickets must track priority (Low, Medium, High, Critical), department, assigned agent, title, description, attachments.
   - Implement workflow validation: agents cannot skip statuses.
   - Automatic escalation if ticket sits in Open too long or priority = High/Critical.

3. **Ticket Messages & Internal Notes**
   - Threaded messages: Customers see only external messages, Agents can add internal notes invisible to customers.
   - Rich-text or Markdown supported.

4. **Audit Logs**
   - Log every ticket change: who, what changed, old value → new value, timestamp.
   - Make logs viewable in admin dashboard with filters (by agent, status, department).

5. **Departments & Agent Assignment**
   - Admin can create departments and assign agents.
   - Tickets auto-assign to agents based on department and workload (fewest open tickets).

6. **Analytics & Dashboard**
   - Admin dashboard: ticket counts per department, average resolution time, agent performance metrics, open vs closed tickets charts.
   - Agent dashboard: my open tickets, pending escalations.
   - Customer dashboard: overview of my tickets.
   - Charts implemented using Chart.js or similar.

7. **Notifications**
   - Email or in-app notifications for ticket creation, assignment, status change, new message.
   - Socket.io can be used for real-time in-app updates (optional but preferred).

8. **Attachments**
   - File uploads using Multer with random UUID filenames.
   - File validation: only images/pdf.
   - Stored locally in `/uploads` directory.

9. **Search, Filter & Pagination**
   - Search tickets by title, ID, customer, agent, or status.
   - Pagination for ticket lists to handle large datasets.

10. **Database Schema (MySQL, local)**
    - users: id, name, email, password_hash, role, created_at, updated_at
    - departments: id, name, created_at, updated_at
    - tickets: id, customer_id, agent_id, department_id, priority, status, title, description, created_at, updated_at
    - ticket_messages: id, ticket_id, user_id, message, is_internal, created_at
    - ticket_attachments: id, ticket_id, file_path, uploaded_by, created_at
    - audit_log: id, ticket_id, user_id, action, old_value, new_value, created_at

11. **Folder Structure**
    - Use MVC structure with `/controllers`, `/models`, `/routes`, `/views`, `/middlewares`, `/public`, `/uploads`.
    - Keep templates modular (partials for navbar, sidebar, flash messages).

12. **Extras for S-Tier**
    - Responsive UI with Tailwind or Bootstrap.
    - Export tickets or reports to CSV (admin-only).
    - Confirmation dialogs for destructive actions.
    - Real-time updates for ticket assignment and new messages.
    
**Deliverable:**  
- Fully working Node.js project that can run locally with MySQL.  
- Do not rely on cloud services like Supabase.  
- Include all backend logic, route handling, controllers, models, Pug templates, and database setup scripts.  
- Make it enterprise-grade: a teacher should believe it could be deployed in a real company.
