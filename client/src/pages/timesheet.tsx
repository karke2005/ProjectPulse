import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/auth";

import type { TaskWithProject, TimesheetWithTask } from "@shared/schema";

export default function Timesheet() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [actualHours, setActualHours] = useState<Record<number, number>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Date validation for timesheet display
  const currentDate = new Date();
  const isCurrentDay = format(selectedDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd');

  const { data: tasks = [] } = useQuery<TaskWithProject[]>({
    queryKey: ['/api/tasks', { date: selectedDate.toISOString() }],
  });

  const { data: timesheets = [] } = useQuery<TimesheetWithTask[]>({
    queryKey: ['/api/timesheets', { date: selectedDate.toISOString() }],
  });

  const todayString = format(currentDate, 'yyyy-MM-dd');
  
  const { data: submissionStatus } = useQuery({
    queryKey: ['/api/task-plans/status', { date: todayString }],
  });

  const { data: timesheetStatus } = useQuery<{
    submitted: boolean;
    totalTasks: number;
    completedTasks: number;
    submission?: { submittedAt: string } | null;
  }>({
    queryKey: ['/api/timesheets/status', { date: todayString }],
  });

  const submitTimesheetMutation = useMutation({
    mutationFn: async () => {
      const timesheetEntries = [];
      
      for (const task of tasks) {
        const hours = actualHours[task.id] || 0;
        if (hours > 0) {
          timesheetEntries.push({
            taskId: task.id,
            userId: task.userId,
            date: task.date,
            actualHours: hours,
            status: 'finished',
          });
        }
      }
      
      if (timesheetEntries.length === 0) {
        throw new Error('Please enter hours for at least one task');
      }
      
      // Submit all timesheet entries
      const promises = timesheetEntries.map(entry => 
        apiRequest('POST', '/api/timesheets', entry)
      );
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timesheet submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets/status'] });
      setActualHours({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleActualHoursChange = (taskId: number, hours: number) => {
    setActualHours(prev => ({ ...prev, [taskId]: hours }));
  };

  const handleSubmitTimesheet = () => {
    submitTimesheetMutation.mutate();
  };

  // Get timesheet data for each task
  const getTimesheetForTask = (taskId: number) => {
    return timesheets.find(ts => ts.task.id === taskId);
  };

  // Calculate totals
  const totalPlannedHours = tasks.reduce((acc, task) => {
    const plannedHours = ((new Date(task.endTime).getTime() - new Date(task.startTime).getTime()) / (1000 * 60 * 60));
    return acc + plannedHours;
  }, 0);

  const totalLoggedHours = timesheets.reduce((acc, timesheet) => {
    return acc + timesheet.actualHours;
  }, 0);

  const pendingTasks = tasks.filter(task => !getTimesheetForTask(task.id));
  const hasSubmittedTimesheet = timesheetStatus && timesheetStatus.submitted;

  // Check if timesheet submission is allowed
  const now = new Date();
  const currentHour = now.getHours();
  const submissionDate = new Date(selectedDate);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  submissionDate.setHours(0, 0, 0, 0);

  const isSubmissionToday = submissionDate.getTime() === todayDate.getTime();
  const isFutureDate = submissionDate.getTime() > todayDate.getTime();
  const isAfter8PM = currentHour >= 20;
  
  const canSubmitTimesheet = !isFutureDate && (!isSubmissionToday || isAfter8PM);
  const timeRestrictionMessage = isSubmissionToday && !isAfter8PM 
    ? `Timesheets for today can only be submitted after 8:00 PM (currently ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})`
    : isFutureDate 
    ? "Cannot submit timesheets for future dates"
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Timesheet</h2>
            <p className="text-gray-600 mt-1">Log your actual work hours and task completion</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Total Logged: <span className="font-semibold text-gray-900">{totalLoggedHours.toFixed(1)} hours</span>
            </div>
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg">
                <i className="fas fa-calendar-day text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <i className="fas fa-clock text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Planned Hours</p>
                <p className="text-2xl font-bold text-gray-900">{totalPlannedHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-50 rounded-lg">
                <i className="fas fa-hourglass text-purple-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Logged Hours</p>
                <p className="text-2xl font-bold text-gray-900">{totalLoggedHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timesheet Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Tasks for {format(selectedDate, 'EEEE, MMMM dd, yyyy')}</CardTitle>
            {pendingTasks.length > 0 && !hasSubmittedTimesheet && (
              <Button 
                onClick={handleSubmitTimesheet}
                disabled={submitTimesheetMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {submitTimesheetMutation.isPending ? "Submitting..." : "Submit Timesheet"}
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-calendar-day text-gray-300 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks scheduled</h3>
              <p className="text-gray-600">You don't have any tasks scheduled for this date.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Planned Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actual Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map((task) => {
                    const timesheet = getTimesheetForTask(task.id);
                    const plannedHours = ((new Date(task.endTime).getTime() - new Date(task.startTime).getTime()) / (1000 * 60 * 60));
                    const currentHours = timesheet?.actualHours ?? actualHours[task.id] ?? 0;
                    
                    return (
                      <tr key={task.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          <div className="text-sm text-gray-500">{task.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            style={{ 
                              backgroundColor: `${task.project.color}20`,
                              color: task.project.color 
                            }}
                          >
                            {task.project.name}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {plannedHours.toFixed(1)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            className="w-20"
                            value={currentHours}
                            onChange={(e) => handleActualHoursChange(task.id, parseFloat(e.target.value) || 0)}
                            disabled={!!timesheet}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {timesheet ? (
                            <Badge 
                              variant={timesheet.status === 'finished' ? 'default' : 'secondary'}
                              className={timesheet.status === 'finished' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}
                            >
                              {timesheet.status === 'finished' ? 'Finished' : 'Moved to Tomorrow'}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      {tasks.length > 0 && !hasSubmittedTimesheet && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <i className="fas fa-info-circle text-blue-600"></i>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">How to submit your timesheet</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>1. Enter the actual hours worked for each task</p>
                <p>2. Click "Submit Timesheet" to log your time</p>
                <p>3. You can only submit once per day</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}