import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import type { UserSubmissionStatus, TaskWithProject } from "@shared/schema";

export default function Admin() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { user } = useAuth();

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

  // Calculate stats
  const totalUsers = userSubmissions.length;
  const submittedCount = userSubmissions.filter(us => us.submission).length;
  const lateCount = userSubmissions.filter(us => us.isLate && us.submission).length;
  const missingCount = userSubmissions.filter(us => !us.submission).length;

  const handleViewUserTasks = (userId: number) => {
    setSelectedUserId(userId);
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
          <TabsTrigger value="submissions">Task Plan Monitoring</TabsTrigger>
          <TabsTrigger value="user-details" disabled={!selectedUserId}>
            User Task Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Task Plan Submission Status - {format(selectedDate, 'MMMM dd, yyyy')}</CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submission Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tasks Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userSubmissions.map((userSubmission) => (
                      <tr key={userSubmission.user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                              <span className="text-xs font-medium text-white">
                                {userSubmission.user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {userSubmission.user.username}
                              </div>
                              <div className="text-sm text-gray-500">
                                {userSubmission.user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={userSubmission.submission ? "default" : "destructive"}
                            className={userSubmission.submission 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                            }
                          >
                            <i className={`fas ${userSubmission.submission ? 'fa-check' : 'fa-times'} mr-1`}></i>
                            {userSubmission.submission ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {userSubmission.submission 
                            ? format(new Date(userSubmission.submission.submittedAt), 'h:mm a')
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {userSubmission.taskCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {userSubmission.submission ? (
                            <Badge 
                              variant={userSubmission.isLate ? "secondary" : "default"}
                              className={userSubmission.isLate 
                                ? "bg-orange-100 text-orange-800" 
                                : "bg-green-100 text-green-800"
                              }
                            >
                              {userSubmission.isLate ? 'Late' : 'On Time'}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-100 text-red-800">
                              Missing
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewUserTasks(userSubmission.user.id)}
                            disabled={userSubmission.taskCount === 0}
                          >
                            View Tasks
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-details">
          {selectedUserId && (
            <Card>
              <CardHeader>
                <CardTitle>
                  User Task Details - {userSubmissions.find(us => us.user.id === selectedUserId)?.user.username}
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                {userTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-calendar-times text-gray-300 text-4xl mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
                    <p className="text-gray-600">This user has no tasks for the selected date.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userTasks.map((task) => (
                      <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                            <div className="mt-2 flex items-center space-x-4">
                              <Badge 
                                style={{ 
                                  backgroundColor: `${task.project.color}20`,
                                  color: task.project.color 
                                }}
                              >
                                {task.project.name}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {format(new Date(task.startTime), 'h:mm a')} - {format(new Date(task.endTime), 'h:mm a')}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {((new Date(task.endTime).getTime() - new Date(task.startTime).getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                            </div>
                            <div className="text-xs text-gray-500">planned</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
