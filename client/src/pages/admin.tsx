import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import type { UserSubmissionStatus, TaskWithProject, TimesheetWithTask } from "@shared/schema";

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
    queryKey: [`/api/admin/user-tasks/${selectedUserId}`, { date: selectedDate.toISOString() }],
    enabled: !!selectedUserId,
  });

  const { data: userTimesheets = [] } = useQuery<TimesheetWithTask[]>({
    queryKey: [`/api/admin/user-timesheets/${selectedUserId}`, { date: selectedDate.toISOString() }],
    enabled: !!selectedUserId,
  });

  // Calculate stats
  const totalUsers = userSubmissions.length;
  const submittedCount = userSubmissions.filter(us => us.submission).length;
  const lateCount = userSubmissions.filter(us => us.isLate && us.submission).length;
  const missingCount = userSubmissions.filter(us => !us.submission).length;

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
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Status Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900">
            Daily Status - {format(selectedDate, 'MMM dd, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Task Plan Submissions</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{submittedCount} of {totalUsers}</div>
              <div className="text-sm text-gray-600">employees submitted</div>
              {missingCount > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">Missing:</div>
                  <div className="flex flex-wrap gap-1">
                    {userSubmissions.filter(us => !us.submission).map(us => (
                      <Badge key={us.user.id} variant="outline" className="text-xs">
                        {us.user.username}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Timesheet Status</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {userSubmissions.filter(us => us.user.id !== 1).length}
              </div>
              <div className="text-sm text-gray-600">employees tracked</div>
              <div className="mt-2 text-xs text-gray-500">
                View individual timesheets below
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userSubmissions.map((userSubmission) => (
              <div key={userSubmission.user.id} className="border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {userSubmission.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{userSubmission.user.username}</div>
                      <div className="text-xs text-gray-500">
                        Task Plan: {userSubmission.taskCount} tasks
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {userSubmission.submission ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Submitted {format(new Date(userSubmission.submission.submittedAt), 'h:mm a')}
                        {userSubmission.isLate && " (Late)"}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-100 text-red-800 text-xs">
                        Not Submitted
                      </Badge>
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

                {/* Expanded User Details */}
                {selectedUserId === userSubmission.user.id && (
                  <div className="border-t border-gray-200 p-3 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Task Plan Section */}
                      <div>
                        <div className="text-xs font-medium text-gray-900 mb-3">
                          Task Plan - {format(selectedDate, 'MMM dd')}
                        </div>
                        {userTasks.length === 0 ? (
                          <div className="text-center py-4">
                            <div className="text-gray-400 text-xs">No tasks planned</div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {userTasks.map((task) => (
                              <div key={task.id} className="p-2 bg-white rounded border">
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
                        )}
                      </div>

                      {/* Timesheet Section */}
                      <div>
                        <div className="text-xs font-medium text-gray-900 mb-3">
                          Timesheet - {format(selectedDate, 'MMM dd')}
                        </div>
                        {userTimesheets.length === 0 ? (
                          <div className="text-center py-4">
                            <div className="text-gray-400 text-xs">No time recorded</div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {userTimesheets.map((timesheet) => (
                              <div key={timesheet.id} className="p-2 bg-white rounded border">
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
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}