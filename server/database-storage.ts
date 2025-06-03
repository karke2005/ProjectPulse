import { 
  users, projects, tasks, timesheets, taskPlanSubmissions,
  type User, type Project, type Task, type Timesheet, type TaskPlanSubmission,
  type InsertUser, type InsertProject, type InsertTask, type InsertTimesheet, type InsertTaskPlanSubmission,
  type TaskWithProject, type TimesheetWithTask, type UserSubmissionStatus
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, ne } from "drizzle-orm";
import bcrypt from "bcrypt";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    try {
      // Check if users already exist
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length > 0) return;

      // Create admin user
      const adminHash = await bcrypt.hash('admin123', 10);
      const adminUser = await db.insert(users).values({
        username: 'admin',
        email: 'admin@company.com',
        password: adminHash,
        role: 'admin',
        notificationEmail: 'admin@company.com',
        timesheetReminderTime: '19:00'
      }).returning();

      // Create regular user
      const userHash = await bcrypt.hash('user123', 10);
      const regularUser = await db.insert(users).values({
        username: 'john.doe',
        email: 'john.doe@company.com',
        password: userHash,
        role: 'user',
        notificationEmail: 'john.doe@company.com',
        timesheetReminderTime: '19:00'
      }).returning();

      // Create a project
      await db.insert(projects).values({
        name: 'Website Redesign',
        description: 'Redesign company website with modern UI',
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-07-31'),
        color: '#3b82f6',
        invoiceAmount: 15000,
        createdBy: adminUser[0].id
      });

      console.log('Initial data created successfully');
    } catch (error) {
      console.log('Error creating initial data:', (error as Error).message);
    }
  }

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
    
    const isValid = await bcrypt.compare(password, user.password);
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
    return await db.select().from(projects).where(eq(projects.createdBy, userId));
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
    return (result.rowCount || 0) > 0;
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
      
      query = db
        .select()
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(
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
    return (result.rowCount || 0) > 0;
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
      
      query = db
        .select()
        .from(timesheets)
        .leftJoin(tasks, eq(timesheets.taskId, tasks.id))
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(
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

  async getAllTimesheetsForAdmin(date?: string, approvalStatus?: string): Promise<TimesheetWithTask[]> {
    let query = db
      .select({
        id: timesheets.id,
        taskId: timesheets.taskId,
        userId: timesheets.userId,
        date: timesheets.date,
        actualHours: timesheets.actualHours,
        status: timesheets.status,
        reason: timesheets.reason,
        approvalStatus: timesheets.approvalStatus,
        approvedBy: timesheets.approvedBy,
        approvedAt: timesheets.approvedAt,
        rejectionReason: timesheets.rejectionReason,
        createdAt: timesheets.createdAt,
        task: {
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          projectId: tasks.projectId,
          userId: tasks.userId,
          startTime: tasks.startTime,
          endTime: tasks.endTime,
          date: tasks.date,
          createdAt: tasks.createdAt,
          project: {
            id: projects.id,
            name: projects.name,
            description: projects.description,
            color: projects.color,
            createdAt: projects.createdAt
          }
        }
      })
      .from(timesheets)
      .innerJoin(tasks, eq(timesheets.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id));

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query.where(
        and(
          gte(timesheets.date, startOfDay),
          lte(timesheets.date, endOfDay)
        )
      );
    }

    if (approvalStatus) {
      query = query.where(eq(timesheets.approvalStatus, approvalStatus));
    }

    const results = await query;
    return results.map(result => ({
      ...result,
      task: {
        ...result.task,
        project: result.task.project
      }
    }));
  }

  async approveTimesheet(timesheetId: number, adminId: number): Promise<Timesheet | undefined> {
    const [updated] = await db
      .update(timesheets)
      .set({
        approvalStatus: 'approved',
        approvedBy: adminId,
        approvedAt: new Date()
      })
      .where(eq(timesheets.id, timesheetId))
      .returning();

    return updated;
  }

  async rejectTimesheet(timesheetId: number, adminId: number, reason?: string): Promise<Timesheet | undefined> {
    const [updated] = await db
      .update(timesheets)
      .set({
        approvalStatus: 'rejected',
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason: reason
      })
      .where(eq(timesheets.id, timesheetId))
      .returning();

    return updated;
  }

  async clearAllSubmissions(): Promise<void> {
    // Clear all timesheets
    await db.delete(timesheets);
    
    // Clear all task plan submissions
    await db.delete(taskPlanSubmissions);
    
    // Clear all tasks
    await db.delete(tasks);
  }

  async resetUsersExceptAdmin(adminId: number): Promise<void> {
    await db.delete(users).where(ne(users.id, adminId));
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }
}