Here you go — **the upgraded bolt.new prompt**, now explicitly requiring that the entire UI is **styled like Zendesk or Freshdesk**.

Copy–paste this version:

---

# **PROMPT FOR BOLT.NEW (WITH MOCK DATA + ZENDESK/FRESHDESK STYLE)**

Build a complete frontend for a **Customer Support Ticketing System**, styled similarly to **Zendesk** or **Freshdesk** (clean, modern, enterprise SaaS look).
The backend already exists using Node.js + MySQL.
Your job: build the entire UI/UX **and also generate a full mock-data demo mode** so the system works without the backend.

---

# **STYLE REQUIREMENT (IMPORTANT)**

Design the entire interface with a **Zendesk/Freshdesk-inspired aesthetic**:

* clean, minimal, enterprise look
* light grey backgrounds
* subtle shadows
* rounded cards
* floating panels
* clear color-coded ticket badges
* modern agent dashboard layout
* consistent spacing
* large readable typography
* clean icons (local SVGs)

No cartoonish UI. Make it professional and corporate.

---

# **TECH STACK**

* **Pug** templates
* **Express** routing
* **TailwindCSS** for styling
* **Vanilla JS** (no React/Vue)
* **Server-side rendering only**
* **Local assets only**
* **Two modes:**

  1. **API Mode** (real REST API)
  2. **Mock Mode** (mock JSON files)

---

# **PAGES**

### **Auth**

* Login
* Register (customer only)

### **Dashboards**

#### Admin Dashboard

* ticket metrics (cards)
* open vs closed stats
* department distribution
* agent performance
* basic charts (SVG/Canvas)

#### Agent Dashboard

* assigned tickets
* SLA warnings
* table with filters

#### Customer Dashboard

* my tickets
* create new ticket
* track status

### **Tickets**

* Tickets list page
* Ticket detail page:

  * metadata
  * assigned agent
  * status
  * priority
  * department
  * full message thread (chat-style)
  * internal notes (locked)
  * attachment preview
  * audit log timeline

### **Admin Pages**

* User management (CRUD)
* Department management (CRUD)
* Role editing for agents

---

# **UI REQUIREMENTS**

Use a **Zendesk/Freshdesk-like** UI layout:

### **General**

* sidebar navigation
* topbar with user dropdown
* dark/light mode
* modal components
* toast notifications
* responsive design
* enterprise dashboard layout
* card-based design using Tailwind
* soft shadows + rounded edges
* minimal color palette

### **Tickets List**

* filters at the top
* status badges (Open, In Progress, etc.)
* priority labels (Low → soft green, High → orange/red)
* clean table layout with alternating row colors

### **Ticket Details**

* chat-style messages with alternating sides
* internal notes with lock icon
* file preview icons (local SVG)
* timeline look for audit log

---

# **FORMS**

Tailwind-styled form components with validation.
Ticket create form: title, description, priority, department, attachments.

---

# **API INTEGRATION (REAL MODE)**

Use async/await fetch calls to:

```
POST /auth/login
POST /auth/register

GET /tickets
GET /tickets/:id
POST /tickets
PATCH /tickets/:id
POST /tickets/:id/messages
POST /tickets/:id/attachments

GET /admin/users
POST /admin/users
PATCH /admin/users/:id
DELETE /admin/users/:id

GET /admin/departments
POST /admin/departments
PATCH /admin/departments/:id
DELETE /admin/departments/:id
```

---

# **MOCK MODE REQUIREMENTS**

When mock mode is enabled, all API calls must pull data from:

```
/public/mock/
```

Create these JSON files:

```
mock-users.json
mock-departments.json
mock-tickets.json
mock-ticket-messages.json
mock-ticket-attachments.json
mock-audit-logs.json
```

### **Mock API system**

Generate `/public/js/mock-api.js`:

* intercept all fetch calls
* return mock JSON data
* simulate artificial latency (200–600ms)
* simulate random errors (~5%)
* identical API response shapes as real mode

### **Toggle**

Create `/config/app.js`:

```
module.exports = {
  useMockData: true
}
```

All fetch calls must automatically switch between mock mode and real mode.

---

# **DELIVERABLES**

* Full Pug template structure
* Full Express route structure
* All Tailwind CSS styling
* All JS scripts
* Mock API system
* JSON mock data files
* Dark/light mode
* Sidebar + topbar
* Modal & toast components
* Zendesk/Freshdesk-inspired UI
* Fully working mock preview version
