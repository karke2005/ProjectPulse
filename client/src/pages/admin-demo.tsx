import { useState } from "react";
import { Calendar, Users, BarChart3, Clock, CheckCircle, AlertCircle, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import {
  mockUsers,
  mockProjects,
  mockTasks,
  mockTimesheets,
  mockTaskPlanSubmissions,
  getWeeklyReport,
  getUserSubmissionStatuses
} from "@/mock-data";

export default function AdminDemo() {
  const [selectedDate, setSelectedDate] = useState(new Date('2025-05-26')); // Monday of our test week
  const [selectedWeek, setSelectedWeek] = useState(new Date('2025-05-26'));

  const weeklyReport = getWeeklyReport();
  const submissionStatuses = getUserSubmissionStatuses(selectedDate);

  // Admin header
  const AdminHeader = () => (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Project Management System - Demo Mode</p>
      </div>
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="px-3 py-1">
          Week of May 26-30, 2025
        </Badge>
        <div className="text-sm text-gray-600">
          Logged in as: admin@company.com
        </div>
      </div>
    </div>
  );

  // Team Overview Tab
  const TeamOverview = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Team Overview</h2>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="border rounded px-2 py-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockUsers.filter(u => u.role !== 'admin').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Task Plans Submitted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submissionStatuses.filter(s => s.submission).length} / {submissionStatuses.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              On-Time Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submissionStatuses.filter(s => s.submission && !s.isLate).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Status - {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {submissionStatuses.map((status) => (
              <div key={status.user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="font-medium">{status.user.username}</div>
                  <Badge variant={status.submission ? "default" : "destructive"}>
                    {status.submission ? "Submitted" : "Not Submitted"}
                  </Badge>
                  {status.isLate && (
                    <Badge variant="outline" className="text-orange-600">
                      Late
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {status.taskCount} tasks planned
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Projects Timeline Tab
  const ProjectsTimeline = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Projects Timeline</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {mockProjects.map((project) => {
          const projectTasks = mockTasks.filter(t => t.projectId === project.id);
          const completedTasks = projectTasks.filter(t => t.status === 'completed');
          const progress = projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;

          return (
            <Card key={project.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="text-sm text-gray-600">
                    {projectTasks.length} total tasks
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Distribution Across Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockProjects.map((project) => {
              const projectTasks = mockTasks.filter(t => t.projectId === project.id);
              const weekDays = [];
              for (let i = 0; i < 5; i++) {
                const day = addDays(new Date('2025-05-26'), i);
                const dayTasks = projectTasks.filter(t => isSameDay(t.date, day));
                weekDays.push({ day, tasks: dayTasks.length });
              }

              return (
                <div key={project.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">{project.name}</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {weekDays.map(({ day, tasks }, index) => (
                      <div key={index} className="text-center">
                        <div className="text-xs text-gray-600 mb-1">
                          {format(day, 'EEE')}
                        </div>
                        <div className="bg-blue-100 rounded p-2 text-sm font-medium">
                          {tasks} tasks
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Weekly Report Tab
  const WeeklyReport = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Weekly Report</h2>
        <div className="text-sm text-gray-600">
          Week of {format(selectedWeek, 'MMM d')} - {format(addDays(selectedWeek, 4), 'MMM d, yyyy')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Planned Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyReport.totalPlannedHours.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Actual Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyReport.totalActualHours.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {(weeklyReport.totalActualHours - weeklyReport.totalPlannedHours).toFixed(1)}h
              </div>
              {weeklyReport.totalActualHours > weeklyReport.totalPlannedHours ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyReport.averageCompliance.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Performance</CardTitle>
            <CardDescription>Plan vs Actual Hours by User</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyReport.userReports.map((report) => (
                <div key={report.user.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">{report.user.username}</div>
                    <Badge variant={report.complianceRate >= 80 ? "default" : "destructive"}>
                      {report.complianceRate.toFixed(0)}% compliance
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Planned</div>
                      <div className="font-medium">{report.plannedHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Actual</div>
                      <div className="font-medium">{report.actualHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Variance</div>
                      <div className={`font-medium ${report.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {report.variance > 0 ? '+' : ''}{report.variance.toFixed(1)}h
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    {report.taskCount} tasks • {report.submissionCount}/5 days submitted
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Project Breakdown</CardTitle>
            <CardDescription>Time Allocation by Project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyReport.projectTotals.map((projectTotal) => (
                <div key={projectTotal.project.id} className="border rounded-lg p-3">
                  <div className="font-medium mb-2">{projectTotal.project.name}</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Planned</div>
                      <div className="font-medium">{projectTotal.plannedHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Actual</div>
                      <div className="font-medium">{projectTotal.actualHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Tasks</div>
                      <div className="font-medium">{projectTotal.taskCount}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Efficiency</span>
                      <span>
                        {projectTotal.plannedHours > 0 
                          ? (projectTotal.actualHours / projectTotal.plannedHours * 100).toFixed(0) 
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={projectTotal.plannedHours > 0 ? (projectTotal.actualHours / projectTotal.plannedHours) * 100 : 0} 
                      className="h-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <AdminHeader />
        
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Overview
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Projects Timeline
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Weekly Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <TeamOverview />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectsTimeline />
          </TabsContent>

          <TabsContent value="reports">
            <WeeklyReport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}