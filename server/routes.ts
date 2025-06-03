import type { Express } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { 
  loginSchema, registerSchema, insertProjectSchema, insertTaskSchema, insertTimesheetSchema,
  type User, type LoginData, type RegisterData 
} from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Middleware to check admin role
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const { confirmPassword, ...userData } = data;
      const user = await storage.createUser(userData);
      
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.validateUserPassword(data.email, data.password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      notificationEmail: req.user.notificationEmail,
      timesheetReminderTime: req.user.timesheetReminderTime,
    });
  });

  // User profile routes
  app.put("/api/user/profile", authenticateToken, async (req: any, res) => {
    try {
      const updates = req.body;
      const updatedUser = await storage.updateUser(req.user.id, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        notificationEmail: updatedUser.notificationEmail,
        timesheetReminderTime: updatedUser.timesheetReminderTime,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Project routes
  app.get("/api/projects", authenticateToken, async (req: any, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/projects", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const projectData = insertProjectSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/projects/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const project = await storage.updateProject(id, updates);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/projects/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProject(id);
      
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Task routes
  app.get("/api/tasks", authenticateToken, async (req: any, res) => {
    try {
      const { date, startDate, endDate } = req.query;
      
      let tasks;
      if (date) {
        tasks = await storage.getTasksByUser(req.user.id, new Date(date));
      } else if (startDate && endDate) {
        tasks = await storage.getTasksByDateRange(
          req.user.id,
          new Date(startDate),
          new Date(endDate)
        );
      } else {
        tasks = await storage.getTasksByUser(req.user.id);
      }
      
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tasks", authenticateToken, async (req: any, res) => {
    try {
      // Convert date strings to Date objects before validation
      const processedBody = {
        ...req.body,
        userId: req.user.id,
        date: new Date(req.body.date),
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
      };

      const taskData = insertTaskSchema.parse(processedBody);
      
      // Check if date is not in the past (except today)
      const taskDate = new Date(taskData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      taskDate.setHours(0, 0, 0, 0);
      
      if (taskDate < today) {
        return res.status(400).json({ message: "Cannot create tasks for past dates" });
      }
      
      const task = await storage.createTask(taskData);
      const taskWithProject = await storage.getTaskWithProject(task.id);
      res.json(taskWithProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/tasks/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Check if task belongs to user or user is admin
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to update this task" });
      }
      
      // Check if date is not in the past (except today)
      if (updates.date) {
        const taskDate = new Date(updates.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        taskDate.setHours(0, 0, 0, 0);
        
        if (taskDate < today) {
          return res.status(400).json({ message: "Cannot move tasks to past dates" });
        }
      }
      
      const updatedTask = await storage.updateTask(id, updates);
      const taskWithProject = await storage.getTaskWithProject(updatedTask!.id);
      res.json(taskWithProject);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tasks/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if task belongs to user or user is admin
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to delete this task" });
      }
      
      const success = await storage.deleteTask(id);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Task plan submission routes
  app.post("/api/task-plans/submit", authenticateToken, async (req: any, res) => {
    try {
      const { date } = req.body;
      const submissionDate = new Date(date);
      
      // Check if already submitted for this date
      const existingSubmission = await storage.getTaskPlanSubmission(req.user.id, submissionDate);
      if (existingSubmission) {
        return res.status(400).json({ message: "Task plan already submitted for this date" });
      }
      
      // Count tasks for the date
      const tasks = await storage.getTasksByUser(req.user.id, submissionDate);
      
      const submission = await storage.createTaskPlanSubmission({
        userId: req.user.id,
        date: submissionDate,
        taskCount: tasks.length,
      });
      
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/task-plans/status", authenticateToken, async (req: any, res) => {
    try {
      const { date } = req.query;
      const checkDate = date ? new Date(date) : new Date();
      
      const submission = await storage.getTaskPlanSubmission(req.user.id, checkDate);
      res.json({ submitted: !!submission, submission });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Timesheet routes
  app.get("/api/timesheets", authenticateToken, async (req: any, res) => {
    try {
      const { date } = req.query;
      const timesheets = await storage.getTimesheetsByUser(
        req.user.id,
        date ? new Date(date) : undefined
      );
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/timesheets/status", authenticateToken, async (req: any, res) => {
    try {
      const { date } = req.query;
      const checkDate = date ? new Date(date) : new Date();
      
      // Get user's tasks for the date
      const tasks = await storage.getTasksByUser(req.user.id, checkDate);
      
      // Get timesheets for the date
      const timesheets = await storage.getTimesheetsByUser(req.user.id, checkDate);
      
      // Check if all tasks have timesheets
      const tasksWithTimesheets = tasks.filter(task => 
        timesheets.some(timesheet => timesheet.taskId === task.id)
      );
      
      const allTasksCompleted = tasks.length > 0 && tasksWithTimesheets.length === tasks.length;
      
      // Find the most recent submission time
      const mostRecentTimesheet = timesheets.length > 0 
        ? timesheets.reduce((latest, current) => 
            new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
          )
        : null;
      
      res.json({
        submitted: allTasksCompleted,
        totalTasks: tasks.length,
        completedTasks: tasksWithTimesheets.length,
        submission: mostRecentTimesheet ? {
          submittedAt: mostRecentTimesheet.createdAt
        } : null
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/timesheets", authenticateToken, async (req: any, res) => {
    try {
      const timesheetData = insertTimesheetSchema.parse({
        ...req.body,
        userId: req.user.id,
        date: new Date(req.body.date),
      });
      
      // Check timesheet submission time restrictions
      const now = new Date();
      const submissionDate = new Date(timesheetData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      submissionDate.setHours(0, 0, 0, 0);
      
      // If submitting for today, check if it's after 8 PM
      if (submissionDate.getTime() === today.getTime()) {
        const currentHour = now.getHours();
        if (currentHour < 20) { // Before 8 PM
          return res.status(400).json({ 
            message: "Timesheets for today can only be submitted after 8:00 PM" 
          });
        }
      }
      
      // If submitting for future dates, reject
      if (submissionDate.getTime() > today.getTime()) {
        return res.status(400).json({ 
          message: "Cannot submit timesheets for future dates" 
        });
      }
      
      // Check if task belongs to user
      const task = await storage.getTask(timesheetData.taskId);
      if (!task || task.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to log time for this task" });
      }
      
      // Check if timesheet already exists for this task and date
      const existingTimesheet = await storage.getTimesheetByTaskAndDate(
        timesheetData.taskId,
        timesheetData.date
      );
      
      if (existingTimesheet) {
        // Update existing timesheet
        const updatedTimesheet = await storage.updateTimesheet(existingTimesheet.id, timesheetData);
        const timesheetWithTask = await storage.getTimesheetWithTask(updatedTimesheet!.id);
        res.json(timesheetWithTask);
      } else {
        // Create new timesheet
        const timesheet = await storage.createTimesheet(timesheetData);
        const timesheetWithTask = await storage.getTimesheetWithTask(timesheet.id);
        res.json(timesheetWithTask);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin routes
  app.get("/api/admin/user-submissions", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { date } = req.query;
      const checkDate = date ? new Date(date) : new Date();
      
      const submissions = await storage.getUserSubmissionStatuses(checkDate);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove password from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/all-user-tasks", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { date } = req.query;
      const checkDate = date ? new Date(date) : new Date();
      
      // Get all users
      const users = await storage.getAllUsers();
      const allTasks = [];
      
      // Fetch tasks for each user
      for (const user of users) {
        const userTasks = await storage.getTasksByUser(user.id, checkDate);
        allTasks.push(...userTasks);
      }
      
      res.json(allTasks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/user-tasks/:userId", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { date } = req.query;
      
      const tasks = await storage.getTasksByUser(
        userId,
        date ? new Date(date) : undefined
      );
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/user-timesheets/:userId", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { date } = req.query;
      
      const timesheets = await storage.getTimesheetsByUser(
        userId,
        date ? new Date(date) : undefined
      );
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/all-timesheets", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { date } = req.query;
      const checkDate = date ? new Date(date) : new Date();
      
      // Get all users
      const users = await storage.getAllUsers();
      const allTimesheets = [];
      
      // Fetch timesheets for each user
      for (const user of users) {
        if (user.id !== 1) { // Exclude admin
          const userTimesheets = await storage.getTimesheetsByUser(user.id, checkDate);
          allTimesheets.push(...userTimesheets);
        }
      }
      
      res.json(allTimesheets);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin timesheet approval routes
  app.get("/api/admin/timesheets", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { date, status } = req.query;
      const timesheets = await storage.getAllTimesheetsForAdmin(date, status);
      res.json(timesheets);
    } catch (error) {
      console.error("Error fetching admin timesheets:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/timesheets/:id/approve", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const timesheetId = parseInt(req.params.id);
      const timesheet = await storage.approveTimesheet(timesheetId, req.user.id);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      res.json(timesheet);
    } catch (error) {
      console.error("Error approving timesheet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/timesheets/:id/reject", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const timesheetId = parseInt(req.params.id);
      const { reason } = req.body;
      const timesheet = await storage.rejectTimesheet(timesheetId, req.user.id, reason);
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }
      res.json(timesheet);
    } catch (error) {
      console.error("Error rejecting timesheet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
