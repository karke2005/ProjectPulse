import { 
  users, projects, tasks, timesheets, taskPlanSubmissions,
  type User, type Project, type Task, type Timesheet, type TaskPlanSubmission,
  type InsertUser, type InsertProject, type InsertTask, type InsertTimesheet, type InsertTaskPlanSubmission,
  type TaskWithProject, type TimesheetWithTask, type UserSubmissionStatus
} from "@shared/schema";
import bcrypt from "bcrypt";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  validateUserPassword(email: string, password: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;

  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUser(userId: number): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Task methods
  getTask(id: number): Promise<Task | undefined>;
  getTaskWithProject(id: number): Promise<TaskWithProject | undefined>;
  getTasksByUser(userId: number, date?: Date): Promise<TaskWithProject[]>;
  getTasksByProject(projectId: number): Promise<Task[]>;
  getTasksByDateRange(userId: number, startDate: Date, endDate: Date): Promise<TaskWithProject[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;

  // Timesheet methods
  getTimesheet(id: number): Promise<Timesheet | undefined>;
  getTimesheetWithTask(id: number): Promise<TimesheetWithTask | undefined>;
  getTimesheetsByUser(userId: number, date?: Date): Promise<TimesheetWithTask[]>;
  getTimesheetByTaskAndDate(taskId: number, date: Date): Promise<Timesheet | undefined>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: number, updates: Partial<Timesheet>): Promise<Timesheet | undefined>;

  // Task plan submission methods
  getTaskPlanSubmission(userId: number, date: Date): Promise<TaskPlanSubmission | undefined>;
  createTaskPlanSubmission(submission: InsertTaskPlanSubmission): Promise<TaskPlanSubmission>;
  getUserSubmissionStatuses(date: Date): Promise<UserSubmissionStatus[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private tasks: Map<number, Task>;
  private timesheets: Map<number, Timesheet>;
  private taskPlanSubmissions: Map<string, TaskPlanSubmission>; // key: userId-date
  private currentUserId: number;
  private currentProjectId: number;
  private currentTaskId: number;
  private currentTimesheetId: number;
  private currentSubmissionId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.tasks = new Map();
    this.timesheets = new Map();
    this.taskPlanSubmissions = new Map();
    this.currentUserId = 1;
    this.currentProjectId = 1;
    this.currentTaskId = 1;
    this.currentTimesheetId = 1;
    this.currentSubmissionId = 1;
    
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const adminUser: User = {
      id: this.currentUserId++,
      username: "admin",
      email: "admin@company.com",
      password: hashedPassword,
      role: "admin",
      notificationEmail: "admin@company.com",
      timesheetReminderTime: "19:00",
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Create regular user
    const userPassword = await bcrypt.hash("user123", 10);
    const regularUser: User = {
      id: this.currentUserId++,
      username: "john.doe",
      email: "john.doe@company.com",
      password: userPassword,
      role: "user",
      notificationEmail: "john.doe@company.com",
      timesheetReminderTime: "19:00",
      createdAt: new Date(),
    };
    this.users.set(regularUser.id, regularUser);

    // Create sample projects
    const project1: Project = {
      id: this.currentProjectId++,
      name: "Website Redesign",
      description: "Complete redesign of company website",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-03-31"),
      color: "#3b82f6",
      invoiceAmount: 2500000, // $25,000 in cents
      createdBy: adminUser.id,
      createdAt: new Date(),
    };
    this.projects.set(project1.id, project1);

    const project2: Project = {
      id: this.currentProjectId++,
      name: "Mobile App Development",
      description: "Native mobile app for iOS and Android",
      startDate: new Date("2024-02-01"),
      endDate: new Date("2024-06-30"),
      color: "#10b981",
      invoiceAmount: 5000000, // $50,000 in cents
      createdBy: adminUser.id,
      createdAt: new Date(),
    };
    this.projects.set(project2.id, project2);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      password: hashedPassword,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async validateUserPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(project => project.createdBy === userId);
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const project: Project = {
      ...insertProject,
      id: this.currentProjectId++,
      createdAt: new Date(),
    };
    this.projects.set(project.id, project);
    return project;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTaskWithProject(id: number): Promise<TaskWithProject | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const project = this.projects.get(task.projectId);
    if (!project) return undefined;
    
    return { ...task, project };
  }

  async getTasksByUser(userId: number, date?: Date): Promise<TaskWithProject[]> {
    const userTasks = Array.from(this.tasks.values()).filter(task => task.userId === userId);
    
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const filteredTasks = userTasks.filter(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= targetDate && taskDate < nextDate;
      });
      
      return this.addProjectsToTasks(filteredTasks);
    }
    
    return this.addProjectsToTasks(userTasks);
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
  }

  async getTasksByDateRange(userId: number, startDate: Date, endDate: Date): Promise<TaskWithProject[]> {
    const userTasks = Array.from(this.tasks.values()).filter(task => {
      if (task.userId !== userId) return false;
      const taskDate = new Date(task.date);
      return taskDate >= startDate && taskDate <= endDate;
    });
    
    return this.addProjectsToTasks(userTasks);
  }

  private addProjectsToTasks(tasks: Task[]): TaskWithProject[] {
    return tasks.map(task => {
      const project = this.projects.get(task.projectId);
      if (!project) throw new Error(`Project not found for task ${task.id}`);
      return { ...task, project };
    }).filter(Boolean);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const task: Task = {
      ...insertTask,
      id: this.currentTaskId++,
      createdAt: new Date(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Timesheet methods
  async getTimesheet(id: number): Promise<Timesheet | undefined> {
    return this.timesheets.get(id);
  }

  async getTimesheetWithTask(id: number): Promise<TimesheetWithTask | undefined> {
    const timesheet = this.timesheets.get(id);
    if (!timesheet) return undefined;
    
    const taskWithProject = await this.getTaskWithProject(timesheet.taskId);
    if (!taskWithProject) return undefined;
    
    return { ...timesheet, task: taskWithProject };
  }

  async getTimesheetsByUser(userId: number, date?: Date): Promise<TimesheetWithTask[]> {
    const userTimesheets = Array.from(this.timesheets.values()).filter(timesheet => timesheet.userId === userId);
    
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const filteredTimesheets = userTimesheets.filter(timesheet => {
        const timesheetDate = new Date(timesheet.date);
        timesheetDate.setHours(0, 0, 0, 0);
        return timesheetDate >= targetDate && timesheetDate < nextDate;
      });
      
      return this.addTasksToTimesheets(filteredTimesheets);
    }
    
    return this.addTasksToTimesheets(userTimesheets);
  }

  async getTimesheetByTaskAndDate(taskId: number, date: Date): Promise<Timesheet | undefined> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    return Array.from(this.timesheets.values()).find(timesheet => {
      if (timesheet.taskId !== taskId) return false;
      const timesheetDate = new Date(timesheet.date);
      timesheetDate.setHours(0, 0, 0, 0);
      return timesheetDate >= targetDate && timesheetDate < nextDate;
    });
  }

  private async addTasksToTimesheets(timesheets: Timesheet[]): Promise<TimesheetWithTask[]> {
    const result: TimesheetWithTask[] = [];
    
    for (const timesheet of timesheets) {
      const taskWithProject = await this.getTaskWithProject(timesheet.taskId);
      if (taskWithProject) {
        result.push({ ...timesheet, task: taskWithProject });
      }
    }
    
    return result;
  }

  async createTimesheet(insertTimesheet: InsertTimesheet): Promise<Timesheet> {
    const timesheet: Timesheet = {
      ...insertTimesheet,
      id: this.currentTimesheetId++,
      createdAt: new Date(),
    };
    this.timesheets.set(timesheet.id, timesheet);
    return timesheet;
  }

  async updateTimesheet(id: number, updates: Partial<Timesheet>): Promise<Timesheet | undefined> {
    const timesheet = this.timesheets.get(id);
    if (!timesheet) return undefined;
    
    const updatedTimesheet = { ...timesheet, ...updates };
    this.timesheets.set(id, updatedTimesheet);
    return updatedTimesheet;
  }

  // Task plan submission methods
  async getTaskPlanSubmission(userId: number, date: Date): Promise<TaskPlanSubmission | undefined> {
    const key = this.getSubmissionKey(userId, date);
    return this.taskPlanSubmissions.get(key);
  }

  async createTaskPlanSubmission(insertSubmission: InsertTaskPlanSubmission): Promise<TaskPlanSubmission> {
    const submission: TaskPlanSubmission = {
      ...insertSubmission,
      id: this.currentSubmissionId++,
      submittedAt: new Date(),
    };
    
    const key = this.getSubmissionKey(submission.userId, submission.date);
    this.taskPlanSubmissions.set(key, submission);
    return submission;
  }

  async getUserSubmissionStatuses(date: Date): Promise<UserSubmissionStatus[]> {
    const users = await this.getAllUsers();
    const result: UserSubmissionStatus[] = [];
    
    for (const user of users) {
      const submission = await this.getTaskPlanSubmission(user.id, date);
      const tasks = await this.getTasksByUser(user.id, date);
      const taskCount = tasks.length;
      
      // Consider late if submitted after 11:00 AM
      const isLate = submission ? submission.submittedAt.getHours() >= 11 : true;
      
      result.push({
        user,
        submission,
        taskCount,
        isLate,
      });
    }
    
    return result;
  }

  private getSubmissionKey(userId: number, date: Date): string {
    const dateStr = date.toISOString().split('T')[0];
    return `${userId}-${dateStr}`;
  }
}

import { users, projects, tasks, timesheets, taskPlanSubmissions, type User, type InsertUser, type Project, type InsertProject, type Task, type InsertTask, type Timesheet, type InsertTimesheet, type TaskPlanSubmission, type InsertTaskPlanSubmission, type TaskWithProject, type TimesheetWithTask, type UserSubmissionStatus } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import bcrypt from "bcrypt";

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async validateUserPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId));
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount > 0;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTaskWithProject(id: number): Promise<TaskWithProject | undefined> {
    const [result] = await db
      .select()
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.id, id));
    
    if (!result?.tasks || !result?.projects) return undefined;
    
    return {
      ...result.tasks,
      project: result.projects
    };
  }

  async getTasksByUser(userId: number, date?: Date): Promise<TaskWithProject[]> {
    let query = db
      .select()
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.userId, userId));

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query.where(and(
        eq(tasks.userId, userId),
        gte(tasks.date, startOfDay),
        lte(tasks.date, endOfDay)
      ));
    }

    const results = await query;
    return results.map(result => ({
      ...result.tasks,
      project: result.projects!
    }));
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async getTasksByDateRange(userId: number, startDate: Date, endDate: Date): Promise<TaskWithProject[]> {
    const results = await db
      .select()
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(
        eq(tasks.userId, userId),
        gte(tasks.date, startDate),
        lte(tasks.date, endDate)
      ));

    return results.map(result => ({
      ...result.tasks,
      project: result.projects!
    }));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount > 0;
  }

  async getTimesheet(id: number): Promise<Timesheet | undefined> {
    const [timesheet] = await db.select().from(timesheets).where(eq(timesheets.id, id));
    return timesheet || undefined;
  }

  async getTimesheetWithTask(id: number): Promise<TimesheetWithTask | undefined> {
    const [result] = await db
      .select()
      .from(timesheets)
      .leftJoin(tasks, eq(timesheets.taskId, tasks.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(timesheets.id, id));
    
    if (!result?.timesheets || !result?.tasks || !result?.projects) return undefined;
    
    return {
      ...result.timesheets,
      task: {
        ...result.tasks,
        project: result.projects
      }
    };
  }

  async getTimesheetsByUser(userId: number, date?: Date): Promise<TimesheetWithTask[]> {
    let query = db
      .select()
      .from(timesheets)
      .leftJoin(tasks, eq(timesheets.taskId, tasks.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(timesheets.userId, userId));

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query.where(and(
        eq(timesheets.userId, userId),
        gte(timesheets.date, startOfDay),
        lte(timesheets.date, endOfDay)
      ));
    }

    const results = await query;
    return results.map(result => ({
      ...result.timesheets,
      task: {
        ...result.tasks!,
        project: result.projects!
      }
    }));
  }

  async getTimesheetByTaskAndDate(taskId: number, date: Date): Promise<Timesheet | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [timesheet] = await db
      .select()
      .from(timesheets)
      .where(and(
        eq(timesheets.taskId, taskId),
        gte(timesheets.date, startOfDay),
        lte(timesheets.date, endOfDay)
      ));
    
    return timesheet || undefined;
  }

  async createTimesheet(insertTimesheet: InsertTimesheet): Promise<Timesheet> {
    const [timesheet] = await db
      .insert(timesheets)
      .values(insertTimesheet)
      .returning();
    return timesheet;
  }

  async updateTimesheet(id: number, updates: Partial<Timesheet>): Promise<Timesheet | undefined> {
    const [timesheet] = await db
      .update(timesheets)
      .set(updates)
      .where(eq(timesheets.id, id))
      .returning();
    return timesheet || undefined;
  }

  async getTaskPlanSubmission(userId: number, date: Date): Promise<TaskPlanSubmission | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [submission] = await db
      .select()
      .from(taskPlanSubmissions)
      .where(and(
        eq(taskPlanSubmissions.userId, userId),
        gte(taskPlanSubmissions.date, startOfDay),
        lte(taskPlanSubmissions.date, endOfDay)
      ));
    
    return submission || undefined;
  }

  async createTaskPlanSubmission(insertSubmission: InsertTaskPlanSubmission): Promise<TaskPlanSubmission> {
    const [submission] = await db
      .insert(taskPlanSubmissions)
      .values(insertSubmission)
      .returning();
    return submission;
  }

  async getUserSubmissionStatuses(date: Date): Promise<UserSubmissionStatus[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const allUsers = await this.getAllUsers();
    const statuses: UserSubmissionStatus[] = [];

    for (const user of allUsers) {
      const submission = await this.getTaskPlanSubmission(user.id, date);
      const userTasks = await this.getTasksByUser(user.id, date);
      
      statuses.push({
        user,
        submission: submission || null,
        taskCount: userTasks.length,
        isLate: !submission && new Date() > endOfDay
      });
    }

    return statuses;
  }
}

export const storage = new DatabaseStorage();
