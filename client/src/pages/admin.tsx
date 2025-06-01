import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserSubmissionStatus, TaskWithProject, TimesheetWithTask, InsertProject } from "@shared/schema";

export default function Admin() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const { user } = useAuth();
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-gray-600 mt-1">Monitor team task plans and timesheet submissions</p>
          </div>
          <div className="flex space-x-3">
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
                          {...field} 
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
                      <Tabs defaultValue="tasks" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="tasks">Task Plan ({format(selectedDate, 'MMM dd')})</TabsTrigger>
                          <TabsTrigger value="timesheet">Timesheet ({format(yesterday, 'MMM dd')})</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="tasks" className="mt-4">
                          {userTasks.length > 0 ? (
                            <div className="space-y-2">
                              {userTasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 text-xs">{task.title}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {format(new Date(task.startTime), 'h:mm a')} - {format(new Date(task.endTime), 'h:mm a')}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-2">
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
                              {isSubmitted && userSubmission.submission && (
                                <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
                                  Submitted: {format(new Date(userSubmission.submission.submittedAt), 'MMM dd, h:mm a')}
                                  {userSubmission.isLate && <span className="text-orange-600"> (Late)</span>}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-gray-400 text-xs">
                              No tasks planned for this date
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="timesheet" className="mt-4">
                          {userTimesheets.length > 0 ? (
                            <div className="space-y-2">
                              {userTimesheets.map((timesheet) => (
                                <div key={timesheet.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 text-xs">{timesheet.task.title}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {timesheet.actualHours}h worked
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-2">
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
                            <div className="text-center py-6 text-gray-400 text-xs">
                              No timesheet entries for this date
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}