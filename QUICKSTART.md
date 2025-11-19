# Quick Start Guide

Get your Support Desk system running in 5 minutes!

## Prerequisites

- ✅ Node.js 14+ installed
- ✅ MySQL 8.0+ installed and running
- ✅ npm installed

## Step 1: Configure Environment

```bash
# Copy the environment template
cp .env.example .env
```

Edit `.env` and update your MySQL credentials:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=supportdesk
DB_PORT=3306

SESSION_SECRET=your_super_secret_random_string_here
```

## Step 2: Setup Database

**Option A: Using the setup script (Recommended)**

```bash
npm run setup:db
```

This will automatically create the database, tables, and views.

**Option B: Manual setup**

```bash
mysql -u root -p < database.sql
```

## Step 3: Create Admin User

```bash
npm run create:admin
```

Follow the prompts:
- Enter your name
- Enter your email
- Enter your password

Example:
```
Admin Name: John Doe
Admin Email: admin@example.com
Admin Password: mySecurePassword123
```

## Step 4: Start the Application

Open **TWO** terminal windows:

**Terminal 1 - Build CSS (keep running):**
```bash
npm run build:css
```

**Terminal 2 - Start server:**
```bash
npm run dev
```

## Step 5: Access the Application

Open your browser and go to:
```
http://localhost:3000
```

Login with the admin credentials you created in Step 3.

## What's Next?

### Create Departments

1. Click **Departments** in the sidebar
2. Click **Create Department**
3. Add departments like:
   - Technical Support
   - Billing
   - Sales

### Create Agent Users

1. Click **Users** in the sidebar
2. Click **Create User**
3. Fill in the details:
   - Name: Agent Name
   - Email: agent@example.com
   - Password: password
   - Role: **Agent**
   - Department: Select a department

### Create a Test Ticket

1. Click **Create Ticket** in the sidebar
2. Fill in:
   - Title: Test ticket
   - Description: This is a test
   - Department: Technical Support
   - Priority: Medium
3. Submit

## Common Issues

### Database Connection Error

❌ **Error:** `Error: connect ECONNREFUSED`

✅ **Solution:**
- Make sure MySQL is running
- Check your DB_PASSWORD in `.env`
- Verify the database exists: `SHOW DATABASES;`

### Port Already in Use

❌ **Error:** `Error: listen EADDRINUSE: address already in use`

✅ **Solution:**
- Change `PORT=3000` to `PORT=3001` in `.env`
- Or kill the process using port 3000

### CSS Not Loading

❌ **Problem:** Pages have no styling

✅ **Solution:**
- Make sure you ran `npm run build:css`
- Check that `public/css/output.css` exists
- Refresh your browser (Ctrl+F5)

### Cannot Create Tables

❌ **Error:** `Table 'users' already exists`

✅ **Solution:**
The database already exists. To reset:
```sql
DROP DATABASE supportdesk;
```
Then run `npm run setup:db` again.

## Development Tips

### Watch Mode

For development, run both of these in separate terminals:

```bash
# Terminal 1 - Auto-rebuild CSS on changes
npm run build:css

# Terminal 2 - Auto-restart server on changes
npm run dev
```

### Creating Sample Data

If you want some sample tickets to test with:

```bash
mysql -u root -p supportdesk < database_sample_data.sql
```

**Note:** You need to edit `database_sample_data.sql` first to add real bcrypt password hashes.

### Access Different Roles

To test different user roles:

1. **Admin:** Login with the admin account you created
2. **Agent:** Create an agent user via Users > Create User
3. **Customer:** Register at `/auth/register` or create via Users menu

## Default Ports

| Service | Port |
|---------|------|
| Application | 3000 |
| MySQL | 3306 |

## File Structure

```
mini-zendesk-redo/
├── app.js              # Main application
├── .env                # Your config (create from .env.example)
├── database.sql        # Database schema
├── package.json        # Dependencies
├── controllers/        # Business logic
├── models/             # Database models
├── routes/             # URL routes
├── views/              # Pug templates
├── public/             # Static files (CSS, JS)
└── uploads/            # User uploaded files
```

## Useful Commands

```bash
# Setup
npm install                 # Install dependencies
npm run setup:db           # Create database
npm run create:admin       # Create admin user

# Development
npm run dev                # Start dev server
npm run build:css          # Build CSS (watch mode)

# Production
npm start                  # Start production server
```

## Next Steps

- Read [README.md](README.md) for full documentation
- Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed API docs
- Explore the admin dashboard
- Create your departments and agents
- Start managing tickets!

## Need Help?

- Check the [README.md](README.md) for detailed docs
- Look at [SETUP_GUIDE.md](SETUP_GUIDE.md) for API reference
- Check the troubleshooting section above

---

🎉 **Congratulations!** Your support desk is now running!
