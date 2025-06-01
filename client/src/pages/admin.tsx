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

  // Calculate stats (excluding admin)
  const employeeSubmissions = userSubmissions.filter(us => us.user.id !== 1);
  const totalUsers = employeeSubmissions.length;
  const submittedCount = employeeSubmissions.filter(us => us.submission).length;
  const lateCount = employeeSubmissions.filter(us => us.isLate && us.submission).length;
  const missingCount = employeeSubmissions.filter(us => !us.submission).length;

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

      {/* Simple Status Message */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm text-gray-900">
          <span className="font-medium">Daily Status ({format(selectedDate, 'MMM dd, yyyy')}):</span> 
          <span className="ml-2">Task Plans: {submittedCount} of {totalUsers} submitted</span>
          {missingCount > 0 && (
            <span className="ml-2 text-red-600">
              • Missing: {employeeSubmissions.filter(us => !us.submission).map(us => us.user.username).join(', ')}
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
            {userSubmissions.filter(us => us.user.id !== 1).map((userSubmission) => (
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}