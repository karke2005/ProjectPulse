import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProjectSchema } from "@shared/schema";
import { z } from "zod";
import { Plus } from "lucide-react";
import type { UserSubmissionStatus, TaskWithProject, Project } from "@shared/schema";

const projectFormSchema = insertProjectSchema.extend({
  startDate: z.string(),
  endDate: z.string(),
  invoiceAmount: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

export default function Admin() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: userTasks = [] } = useQuery<TaskWithProject[]>({
    queryKey: ['/api/admin/user-tasks', selectedUserId, { date: selectedDate.toISOString() }],
    enabled: !!selectedUserId,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Calculate stats
  const totalUsers = userSubmissions.length;
  const submittedCount = userSubmissions.filter(us => us.submission).length;
  const lateCount = userSubmissions.filter(us => us.isLate && us.submission).length;
  const missingCount = userSubmissions.filter(us => !us.submission).length;

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      color: "#3b82f6",
      invoiceAmount: "",
      createdBy: user?.id || 1,
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        invoiceAmount: data.invoiceAmount ? Math.round(parseFloat(data.invoiceAmount) * 100) : 0, // Convert to cents
      };
      return apiRequest('POST', '/api/projects', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      setShowProjectForm(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const handleViewUserTasks = (userId: number) => {
    setSelectedUserId(userId);
  };

  const onSubmit = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-gray-600 mt-1">Monitor team task plans and project progress</p>
          </div>
          <div className="flex space-x-3">
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg">
                <i className="fas fa-users text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <i className="fas fa-check-circle text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Plans Submitted</p>
                <p className="text-2xl font-bold text-gray-900">{submittedCount}/{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-50 rounded-lg">
                <i className="fas fa-clock text-orange-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Late Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{lateCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-50 rounded-lg">
                <i className="fas fa-exclamation-triangle text-red-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Missing Plans</p>
                <p className="text-2xl font-bold text-gray-900">{missingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="submissions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="submissions">Daily Status</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Task Plan Status - {format(selectedDate, 'MMMM dd, yyyy')}</CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {userSubmissions.map((userSubmission) => (
                  <div key={userSubmission.user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {userSubmission.user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{userSubmission.user.username}</div>
                        <div className="text-sm text-gray-500">{userSubmission.taskCount} tasks</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {userSubmission.submission ? (
                        <>
                          <Badge className="bg-green-100 text-green-800">
                            Submitted {format(new Date(userSubmission.submission.submittedAt), 'h:mm a')}
                          </Badge>
                          {userSubmission.isLate && (
                            <Badge className="bg-orange-100 text-orange-800">Late</Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewUserTasks(userSubmission.user.id)}
                            disabled={userSubmission.taskCount === 0}
                          >
                            View Tasks
                          </Button>
                        </>
                      ) : (
                        <Badge variant="destructive" className="bg-red-100 text-red-800">
                          Missing Plan
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedUserId && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-4">
                    Tasks for {userSubmissions.find(us => us.user.id === selectedUserId)?.user.username}
                  </h4>
                  {userTasks.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No tasks found for this date.</p>
                  ) : (
                    <div className="space-y-3">
                      {userTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">{task.title}</div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(task.startTime), 'h:mm a')} - {format(new Date(task.endTime), 'h:mm a')}
                            </div>
                          </div>
                          <Badge style={{ backgroundColor: `${task.project.color}20`, color: task.project.color }}>
                            {task.project.name}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Project Management</h3>
              <Button onClick={() => setShowProjectForm(!showProjectForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </div>

            {showProjectForm && (
              <Card>
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
                                <Input type="date" {...field} />
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
                                <Input type="date" {...field} />
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
                                  {...field} 
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

            <Card>
              <CardHeader>
                <CardTitle>Existing Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
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
                          {format(new Date(project.startDate), 'MMM dd')} - {format(new Date(project.endDate), 'MMM dd')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
