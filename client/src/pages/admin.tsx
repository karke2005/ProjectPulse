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
                      <div className="text-xs text-gray-600">
                        <div className="mb-1">
                          <span className="font-medium">Task Plan:</span> {userSubmission.taskCount} tasks scheduled for today
                        </div>
                        <div>
                          <span className="font-medium">Timesheet:</span> {hasTimesheet ? 'Submitted for yesterday' : 'No timesheet submitted for yesterday'}
                        </div>
                        {isSubmitted && userSubmission.submission && (
                          <div className="mt-1">
                            <span className="font-medium">Submitted at:</span> {format(new Date(userSubmission.submission.submittedAt), 'MMM dd, h:mm a')}
                            {userSubmission.isLate && <span className="text-orange-600"> (Late submission)</span>}
                          </div>
                        )}
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
  );
}