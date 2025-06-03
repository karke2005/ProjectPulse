import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserSubmissionStatus, TaskWithProject, TimesheetWithTask, InsertProject, Project } from "@shared/schema";

export default function Admin() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showProjectsView, setShowProjectsView] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      startDate: new Date(),
      endDate: new Date(),
      invoiceAmount: 0,
    },
  });

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <i className="fas fa-lock text-gray-300 text-4xl mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You need admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: userSubmissions = [] } = useQuery<UserSubmissionStatus[]>({
    queryKey: ['/api/admin/user-submissions', { date: selectedDate.toISOString() }],
  });

  // Get yesterday's date for timesheet status
  const yesterday = new Date(selectedDate);
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: yesterdayTimesheets = [] } = useQuery<TimesheetWithTask[]>({
    queryKey: ['/api/admin/all-timesheets', { date: yesterday.toISOString() }],
  });

  const { data: userTasks = [] } = useQuery<TaskWithProject[]>({
    queryKey: [`/api/admin/user-tasks/${selectedUserId}`, { date: selectedDate.toISOString() }],
    enabled: !!selectedUserId,
  });

  const { data: userTimesheets = [] } = useQuery<TimesheetWithTask[]>({
    queryKey: [`/api/admin/user-timesheets/${selectedUserId}`, { date: selectedDate.toISOString() }],
    enabled: !!selectedUserId,
  });

  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: allUserTasks = [] } = useQuery<TaskWithProject[]>({
    queryKey: ['/api/admin/all-user-tasks', { date: selectedDate.toISOString() }],
  });

  // Calculate stats (excluding admin)
  const employeeSubmissions = userSubmissions.filter(us => us.user.id !== 1);
  const totalUsers = employeeSubmissions.length;
  const submittedCount = employeeSubmissions.filter(us => us.submission).length;
  const lateCount = employeeSubmissions.filter(us => us.isLate && us.submission).length;
  const missingCount = employeeSubmissions.filter(us => !us.submission).length;

  // Calculate timesheet stats for yesterday
  const usersWithTimesheets = new Set(yesterdayTimesheets.map(ts => ts.userId));
  const timesheetSubmittedCount = employeeSubmissions.filter(us => usersWithTimesheets.has(us.user.id)).length;
  const timesheetMissingCount = totalUsers - timesheetSubmittedCount;

  const createProjectMutation = useMutation({
    mutationFn: (data: InsertProject) => apiRequest('POST', '/api/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      form.reset();
      setShowProjectForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProject) => {
    createProjectMutation.mutate(data);
  };

  const handleViewUserTasks = (userId: number) => {
    setSelectedUserId(selectedUserId === userId ? null : userId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.username}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/admin/users'}
              >
                User Management
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/admin/timesheets'}
              >
                Timesheet Approvals
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/profile'}
              >
                Profile
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={logout}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
              <p className="text-gray-600 mt-1">Monitor team task plans and timesheet submissions</p>
            </div>
          <div className="flex space-x-3">
            <Button onClick={() => setShowProjectsView(!showProjectsView)} variant="outline">
              {showProjectsView ? 'Team Overview' : 'Projects Timeline'}
            </Button>
            <Button onClick={() => setShowProjectForm(!showProjectForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Project Form */}
      {showProjectForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter project name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input type="color" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoiceAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Amount ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            value={field.value || ''}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter project description" 
                          className="resize-none"
                          value={field.value || ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-3">
                  <Button type="submit" disabled={createProjectMutation.isPending}>
                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowProjectForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {showProjectsView ? (
        // Projects Timeline View
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projects Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allProjects.map((project) => {
                  const startDate = new Date(project.startDate);
                  const endDate = new Date(project.endDate);
                  const today = new Date();
                  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                  const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                  const progressPercentage = Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);
                  
                  // Get tasks for this project
                  const projectTasks = allUserTasks.filter(task => task.projectId === project.id);
                  
                  return (
                    <div key={project.id} className="border border-gray-200 rounded-lg">
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedProjectId(selectedProjectId === project.id ? null : project.id)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: project.color }}
                            />
                            <div>
                              <div className="font-medium text-gray-900">{project.name}</div>
                              <div className="text-sm text-gray-500">{project.description}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              ${((project.invoiceAmount || 0) / 100).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd')}
                            </div>
                          </div>
                        </div>
                        
                        {/* Timeline Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Timeline Progress</span>
                            <span>{Math.round(progressPercentage)}% elapsed</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${progressPercentage}%`,
                                backgroundColor: project.color 
                              }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>{projectTasks.length} tasks</span>
                            <span>{totalDays - elapsedDays > 0 ? `${totalDays - elapsedDays} days left` : 'Completed'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Gantt View */}
                      {selectedProjectId === project.id && projectTasks.length > 0 && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50">
                          <div className="text-sm font-medium text-gray-900 mb-3">
                            Task Schedule - {format(selectedDate, 'MMM dd, yyyy')}
                          </div>
                          <div className="space-y-2">
                            {projectTasks
                              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                              .map((task) => {
                                // Find user for this task
                                const taskUser = employeeSubmissions.find(us => us.user.id === task.userId)?.user;
                                return (
                                  <div key={task.id} className="flex items-center p-3 bg-white rounded border">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3">
                                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                          <span className="text-xs font-medium text-white">
                                            {taskUser?.username.charAt(0).toUpperCase() || 'U'}
                                          </span>
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900 text-sm">{task.title}</div>
                                          <div className="text-xs text-gray-500">
                                            {taskUser?.username || 'Unknown User'} • 
                                            {format(new Date(task.startTime), 'h:mm a')} - {format(new Date(task.endTime), 'h:mm a')}
                                          </div>
                                          {task.description && (
                                            <div className="text-xs text-gray-400 mt-1">{task.description}</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <span className="text-xs text-gray-500">
                                        {((new Date(task.endTime).getTime() - new Date(task.startTime).getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                                      </span>
                                      <div className="w-20 bg-gray-200 rounded-full h-2">
                                        <div 
                                          className="h-2 rounded-full"
                                          style={{ 
                                            width: '100%',
                                            backgroundColor: project.color + '80'
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Team Overview
        <div>
          {/* Simple Status Message */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-gray-900">
              <span className="font-medium">Today's Task Plans:</span> 
              <span className="ml-2">{submittedCount} of {totalUsers} submitted</span>
              {missingCount > 0 && (
                <span className="ml-2 text-red-600">
                  • Missing: {employeeSubmissions.filter(us => !us.submission).map(us => us.user.username).join(', ')}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-900 mt-2">
              <span className="font-medium">Yesterday's Timesheets:</span>
              <span className="ml-2">{timesheetSubmittedCount} of {totalUsers} submitted</span>
              {timesheetMissingCount > 0 && (
                <span className="ml-2 text-red-600">
                  • Missing: {employeeSubmissions.filter(us => !usersWithTimesheets.has(us.user.id)).map(us => us.user.username).join(', ')}
                </span>
              )}
            </div>
          </div>

          {/* Employee Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userSubmissions.filter(us => us.user.id !== 1).map((userSubmission) => {
                  const hasTimesheet = usersWithTimesheets.has(userSubmission.user.id);
                  const isSubmitted = !!userSubmission.submission;
                  
                  return (
                    <div 
                      key={userSubmission.user.id} 
                      className={`border rounded-lg p-3 ${isSubmitted ? 'bg-green-50 border-green-200' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isSubmitted ? 'bg-green-600' : 'bg-gray-400'}`}>
                            <span className="text-xs font-medium text-white">
                              {userSubmission.user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{userSubmission.user.username}</div>
                            <div className="text-xs text-gray-500">
                              {userSubmission.taskCount} tasks planned
                              {hasTimesheet ? ' • Timesheet submitted' : ' • No timesheet'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isSubmitted && userSubmission.submission && (
                            <div className="text-xs text-green-700">
                              {format(new Date(userSubmission.submission.submittedAt), 'h:mm a')}
                              {userSubmission.isLate && " (Late)"}
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleViewUserTasks(userSubmission.user.id)}
                          >
                            {selectedUserId === userSubmission.user.id ? 'Hide Details' : 'View Details'}
                          </Button>
                        </div>
                      </div>
                      
                      {selectedUserId === userSubmission.user.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Task Plan Block */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="text-xs font-medium text-blue-900 mb-3">
                                <div>Task Plan ({format(selectedDate, 'MMM dd')})</div>
                                {isSubmitted && userSubmission.submission && (
                                  <div className="text-xs text-blue-700 mt-1">
                                    Submitted: {format(new Date(userSubmission.submission.submittedAt), 'h:mm a')}
                                    {userSubmission.isLate && <span className="text-orange-600"> (Late)</span>}
                                  </div>
                                )}
                              </div>
                              {userTasks.length > 0 ? (
                                <div className="space-y-2">
                                  {userTasks.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map((task) => (
                                    <div key={task.id} className="p-2 bg-white rounded border border-blue-100">
                                      <div className="font-medium text-gray-900 text-xs">{task.title}</div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {format(new Date(task.startTime), 'h:mm a')} - {format(new Date(task.endTime), 'h:mm a')}
                                      </div>
                                      <div className="flex items-center justify-between mt-1">
                                        <Badge 
                                          className="text-xs"
                                          style={{ backgroundColor: `${task.project.color}20`, color: task.project.color }}
                                        >
                                          {task.project.name}
                                        </Badge>
                                        <span className="text-xs text-gray-500">
                                          {((new Date(task.endTime).getTime() - new Date(task.startTime).getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-blue-400 text-xs">
                                  No tasks planned for this date
                                </div>
                              )}
                            </div>

                            {/* Timesheet Block */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="text-xs font-medium text-green-900 mb-3">
                                Timesheet ({format(yesterday, 'MMM dd')})
                              </div>
                              {userTimesheets.length > 0 ? (
                                <div className="space-y-2">
                                  {userTimesheets.map((timesheet) => (
                                    <div key={timesheet.id} className="p-2 bg-white rounded border border-green-100">
                                      <div className="font-medium text-gray-900 text-xs">{timesheet.task.title}</div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {timesheet.actualHours}h worked
                                      </div>
                                      <div className="flex items-center justify-between mt-1">
                                        <Badge 
                                          className="text-xs"
                                          style={{ backgroundColor: `${timesheet.task.project.color}20`, color: timesheet.task.project.color }}
                                        >
                                          {timesheet.task.project.name}
                                        </Badge>
                                        <Badge className={`text-xs ${timesheet.status === 'finished' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                          {timesheet.status === 'finished' ? 'Completed' : 'Moved to Tomorrow'}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-green-400 text-xs">
                                  No timesheet entries for this date
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}