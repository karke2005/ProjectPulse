# Project Management Application

A comprehensive full-stack project management application built with React, Express, and PostgreSQL, featuring task planning, timesheet tracking, and admin dashboard with Gantt chart visualization.

## Features

### User Features
- **Task Planning**: Interactive calendar-based task planning with drag-and-drop functionality
- **Timesheet Management**: Track actual hours worked and task completion status
- **Project Assignment**: Assign tasks to specific projects with color-coded organization
- **Profile Management**: Update user profile information

### Admin Features
- **Team Overview**: Monitor employee task plan submissions and timesheet completion
- **Projects Timeline**: Gantt chart visualization showing project progress and task schedules
- **User Management**: View detailed task and timesheet information for all team members
- **Project Management**: Create and manage projects with timeline tracking

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for routing
- **TanStack Query** for state management
- **React Hook Form** with Zod validation
- **Tailwind CSS** with Shadcn/ui components
- **Date-fns** for date manipulation
- **Framer Motion** for animations

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** for database operations
- **PostgreSQL** database
- **JWT** authentication
- **Bcrypt** for password hashing
- **Passport.js** for session management

## Database Schema

The application uses a PostgreSQL database with the following main tables:
- `users` - User authentication and profile information
- `projects` - Project details with timeline and budget tracking
- `tasks` - Individual tasks with time slots and project assignments
- `timesheets` - Actual time tracking and completion status
- `task_plan_submissions` - Task plan submission tracking

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd project-management-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Database configuration
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
PGHOST=localhost
PGPORT=5432
PGUSER=username
PGPASSWORD=password
PGDATABASE=database_name
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Default Accounts

The application comes with pre-configured test accounts:

**Admin Account:**
- Email: `admin@company.com`
- Password: `admin123`
- Access: Full admin dashboard and user management

**Regular User Account:**
- Email: `john.doe@company.com`
- Password: `user123`
- Access: Task planning and timesheet features

## Usage

### For Regular Users:
1. Log in with user credentials
2. Navigate to Task Planning to create and organize daily tasks
3. Use Timesheet to track actual hours and mark task completion
4. Submit task plans for admin review

### For Administrators:
1. Log in with admin credentials
2. Access the admin dashboard to monitor team activity
3. View team overview for submission status
4. Use projects timeline for Gantt chart visualization
5. Create and manage projects

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Tasks
- `GET /api/tasks` - Get user tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project (admin only)

### Admin
- `GET /api/admin/user-submissions` - Get team submission status
- `GET /api/admin/user-tasks/:userId` - Get user tasks
- `GET /api/admin/all-timesheets` - Get all timesheets

## Development

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and services
├── server/                # Express backend
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database interface
│   └── db.ts              # Database connection
├── shared/                # Shared types and schemas
│   └── schema.ts          # Drizzle schema definitions
└── package.json
```

### Key Components
- **TaskPlanning**: Main calendar interface for task creation
- **Timesheet**: Time tracking and task completion
- **Admin**: Administrative dashboard with team monitoring
- **DatabaseStorage**: PostgreSQL data layer implementation

## Deployment

The application is designed to run on Replit with PostgreSQL database support. For production deployment:

1. Set up a PostgreSQL database
2. Configure environment variables
3. Run database migrations with `npm run db:push`
4. Deploy to your preferred hosting platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.