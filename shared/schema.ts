import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // "user" | "admin"
  notificationEmail: text("notification_email"),
  timesheetReminderTime: text("timesheet_reminder_time").default("19:00"), // HH:MM format
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  color: text("color").notNull().default("#3b82f6"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  date: timestamp("date").notNull(), // Date of the task
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  userId: integer("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  actualHours: real("actual_hours").notNull(),
  status: text("status").notNull(), // "finished" | "moved_to_tomorrow"
  reason: text("reason"), // Required when status is "moved_to_tomorrow"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskPlanSubmissions = pgTable("task_plan_submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  taskCount: integer("task_count").notNull().default(0),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
});

export const insertTaskPlanSubmissionSchema = createInsertSchema(taskPlanSubmissions).omit({
  id: true,
  submittedAt: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Register schema  
export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Timesheet = typeof timesheets.$inferSelect;
export type TaskPlanSubmission = typeof taskPlanSubmissions.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type InsertTaskPlanSubmission = z.infer<typeof insertTaskPlanSubmissionSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

// Extended types for API responses
export type TaskWithProject = Task & {
  project: Project;
};

export type TimesheetWithTask = Timesheet & {
  task: TaskWithProject;
};

export type UserSubmissionStatus = {
  user: User;
  submission: TaskPlanSubmission | null;
  taskCount: number;
  isLate: boolean;
};
