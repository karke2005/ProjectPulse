// Mock data for frontend demo
import { addDays, format } from 'date-fns';

export interface MockUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface MockProject {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold';
}

export interface MockTask {
  id: number;
  title: string;
  description: string;
  projectId: number;
  project: MockProject;
  assignedTo: number;
  date: Date;
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'in-progress' | 'completed';
  plannedHours: number;
}

export interface MockTimesheet {
  id: number;
  taskId: number;
  task: MockTask;
  userId: number;
  date: Date;
  hoursWorked: number;
  notes: string;
}

export interface MockTaskPlanSubmission {
  id: number;
  userId: number;
  date: Date;
  submittedAt: Date;
}

// Mock data for the week of May 26-30, 2025
const baseDate = new Date('2025-05-26'); // Monday

export const mockUsers: MockUser[] = [
  { id: 1, username: 'alice.chen', email: 'alice.chen@company.com', role: 'user' },
  { id: 2, username: 'bob.williams', email: 'bob.williams@company.com', role: 'user' },
  { id: 3, username: 'admin', email: 'admin@company.com', role: 'admin' },
  { id: 4, username: 'carol.davis', email: 'carol.davis@company.com', role: 'user' },
  { id: 5, username: 'david.miller', email: 'david.miller@company.com', role: 'user' },
  { id: 6, username: 'emma.johnson', email: 'emma.johnson@company.com', role: 'user' },
  { id: 7, username: 'frank.brown', email: 'frank.brown@company.com', role: 'user' },
  { id: 8, username: 'grace.wilson', email: 'grace.wilson@company.com', role: 'user' },
  { id: 9, username: 'henry.taylor', email: 'henry.taylor@company.com', role: 'user' },
  { id: 10, username: 'ivy.anderson', email: 'ivy.anderson@company.com', role: 'user' },
  { id: 11, username: 'jack.thomas', email: 'jack.thomas@company.com', role: 'user' }
];

export const mockProjects: MockProject[] = [
  { id: 1, name: 'E-commerce Platform', description: 'Building new e-commerce platform', status: 'active' },
  { id: 2, name: 'Mobile App Development', description: 'iOS and Android mobile application', status: 'active' },
  { id: 3, name: 'Data Analytics Dashboard', description: 'Business intelligence dashboard', status: 'active' }
];

// Generate tasks and timesheets
export const mockTasks: MockTask[] = [];
export const mockTimesheets: MockTimesheet[] = [];
export const mockTaskPlanSubmissions: MockTaskPlanSubmission[] = [];

let taskId = 1;
let timesheetId = 1;
let submissionId = 1;

// Generate realistic data for each user
mockUsers.forEach(user => {
  if (user.role === 'admin') return;

  for (let day = 0; day < 5; day++) {
    const currentDate = addDays(baseDate, day);
    
    // Task plan submission patterns (realistic compliance)
    const submissionPatterns = {
      1: { submitted: true, delay: 0 }, // Alice - always on time
      2: { submitted: true, delay: 1 }, // Bob - 1 day late
      4: { submitted: day < 4, delay: 0 }, // Carol - submits early, misses Friday
      5: { submitted: day % 2 === 0, delay: 0 }, // David - submits alternate days
      6: { submitted: true, delay: day > 2 ? 2 : 0 }, // Emma - late submissions later in week
      7: { submitted: day < 3, delay: 0 }, // Frank - stops submitting midweek
      8: { submitted: true, delay: 0 }, // Grace - always on time
      9: { submitted: day !== 1, delay: 1 }, // Henry - misses Tuesday, always late
      10: { submitted: day < 4, delay: day }, // Ivy - increasing delays
      11: { submitted: day > 1, delay: 0 } // Jack - starts submitting Wednesday
    };

    const pattern = submissionPatterns[user.id as keyof typeof submissionPatterns];
    
    if (pattern?.submitted) {
      const submissionDate = addDays(currentDate, pattern.delay);
      mockTaskPlanSubmissions.push({
        id: submissionId++,
        userId: user.id,
        date: currentDate,
        submittedAt: submissionDate
      });

      // Generate 2-4 tasks per day for users who submitted
      const numTasks = Math.floor(Math.random() * 3) + 2;
      for (let t = 0; t < numTasks; t++) {
        const project = mockProjects[Math.floor(Math.random() * mockProjects.length)];
        const startHour = 9 + (t * 2);
        const duration = Math.floor(Math.random() * 3) + 1; // 1-3 hours
        
        const startTime = new Date(currentDate);
        startTime.setHours(startHour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startHour + duration, 0, 0, 0);

        const task: MockTask = {
          id: taskId++,
          title: `${project.name} - Task ${t + 1}`,
          description: `Work on ${project.name} development`,
          projectId: project.id,
          project: project,
          assignedTo: user.id,
          date: currentDate,
          startTime: startTime,
          endTime: endTime,
          status: 'pending',
          plannedHours: duration
        };

        mockTasks.push(task);

        // Generate timesheet entries (varied compliance)
        const timesheetCompliance = {
          1: 0.95, // Alice - 95% compliance
          2: 0.8,  // Bob - 80% compliance
          4: 0.9,  // Carol - 90% compliance
          5: 0.7,  // David - 70% compliance
          6: 0.85, // Emma - 85% compliance
          7: 0.6,  // Frank - 60% compliance
          8: 0.95, // Grace - 95% compliance
          9: 0.75, // Henry - 75% compliance
          10: 0.8, // Ivy - 80% compliance
          11: 0.9  // Jack - 90% compliance
        };

        const compliance = timesheetCompliance[user.id as keyof typeof timesheetCompliance] || 0.8;
        
        if (Math.random() < compliance) {
          // Realistic variance in actual vs planned hours
          const variance = (Math.random() - 0.5) * 0.4; // ±20% variance
          const actualHours = Math.max(0.5, duration + (duration * variance));
          
          mockTimesheets.push({
            id: timesheetId++,
            taskId: task.id,
            task: task,
            userId: user.id,
            date: currentDate,
            hoursWorked: Math.round(actualHours * 10) / 10,
            notes: `Completed ${task.title}`
          });
        }
      }
    }
  }
});

export const getCurrentUser = (): MockUser => ({
  id: 3,
  username: 'admin',
  email: 'admin@company.com',
  role: 'admin'
});

export const getWeeklyReport = () => {
  const userReports = mockUsers
    .filter(user => user.role !== 'admin')
    .map(user => {
      const userTasks = mockTasks.filter(task => task.assignedTo === user.id);
      const userTimesheets = mockTimesheets.filter(ts => ts.userId === user.id);
      const userSubmissions = mockTaskPlanSubmissions.filter(sub => sub.userId === user.id);
      
      const plannedHours = userTasks.reduce((sum, task) => sum + task.plannedHours, 0);
      const actualHours = userTimesheets.reduce((sum, ts) => sum + ts.hoursWorked, 0);
      const variance = actualHours - plannedHours;
      const variancePercentage = plannedHours > 0 ? (variance / plannedHours) * 100 : 0;
      
      return {
        user,
        plannedHours,
        actualHours,
        variance,
        variancePercentage,
        taskCount: userTasks.length,
        submissionCount: userSubmissions.length,
        expectedSubmissions: 5, // 5 days in the week
        complianceRate: userSubmissions.length / 5 * 100
      };
    });

  const projectTotals = mockProjects.map(project => {
    const projectTasks = mockTasks.filter(task => task.projectId === project.id);
    const projectTimesheets = mockTimesheets.filter(ts => 
      projectTasks.some(task => task.id === ts.taskId)
    );
    
    const plannedHours = projectTasks.reduce((sum, task) => sum + task.plannedHours, 0);
    const actualHours = projectTimesheets.reduce((sum, ts) => sum + ts.hoursWorked, 0);
    
    return {
      project,
      plannedHours,
      actualHours,
      variance: actualHours - plannedHours,
      taskCount: projectTasks.length
    };
  });

  return {
    userReports,
    projectTotals,
    totalPlannedHours: userReports.reduce((sum, report) => sum + report.plannedHours, 0),
    totalActualHours: userReports.reduce((sum, report) => sum + report.actualHours, 0),
    averageCompliance: userReports.reduce((sum, report) => sum + report.complianceRate, 0) / userReports.length
  };
};

export const getUserSubmissionStatuses = (date: Date) => {
  return mockUsers
    .filter(user => user.role !== 'admin')
    .map(user => {
      const submission = mockTaskPlanSubmissions.find(
        sub => sub.userId === user.id && 
        format(sub.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      
      const userTasks = mockTasks.filter(
        task => task.assignedTo === user.id && 
        format(task.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      
      const isLate = submission ? submission.submittedAt > submission.date : false;
      
      return {
        user,
        submission: submission || null,
        taskCount: userTasks.length,
        isLate
      };
    });
};