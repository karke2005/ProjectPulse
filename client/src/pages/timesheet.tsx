import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/auth";
import DeferModal from "@/components/task/defer-modal";
import { StatusBanner } from "@/components/ui/status-banner";
import type { TaskWithProject, TimesheetWithTask, TaskPlanSubmission } from "@shared/schema";

export default function Timesheet() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [actualHours, setActualHours] = useState<Record<number, number>>({});
  const [isDeferModalOpen, setIsDeferModalOpen] = useState(false);
  const [deferringTask, setDeferringTask] = useState<TaskWithProject | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only allow today's date for timesheet
  const today = new Date();
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

  const { data: tasks = [] } = useQuery<TaskWithProject[]>({
    queryKey: ['/api/tasks', { date: selectedDate.toISOString() }],
  });

  const { data: timesheets = [] } = useQuery<TimesheetWithTask[]>({
    queryKey: ['/api/timesheets', { date: selectedDate.toISOString() }],
  });

  const todayString = format(today, 'yyyy-MM-dd');
  
  const { data: submissionStatus } = useQuery<{ submitted: boolean; submission: TaskPlanSubmission | null }>({
    queryKey: ['/api/task-plans/status', { date: todayString }],
  });

  const { data: timesheetStatus } = useQuery({
    queryKey: ['/api/timesheets/status', { date: todayString }],
  });

  const createTimesheetMutation = useMutation({
    mutationFn: (timesheetData: any) => apiRequest('POST', '/api/timesheets', timesheetData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timesheet updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: number; reason: string }) => {
      // Create timesheet entry with "moved_to_tomorrow" status
      return apiRequest('POST', '/api/timesheets', {
        taskId,
        date: selectedDate.toISOString(),
        actualHours: actualHours[taskId] || 0,
        status: 'moved_to_tomorrow',
        reason,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task moved to tomorrow",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
      setIsDeferModalOpen(false);
      setDeferringTask(null);
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

  const handleMarkFinished = (task: TaskWithProject) => {
    const hours = actualHours[task.id] || 0;
    
    createTimesheetMutation.mutate({
      taskId: task.id,
      date: selectedDate.toISOString(),
      actualHours: hours,
      status: 'finished',
    });
  };

  const handleMoveToTomorrow = (task: TaskWithProject) => {
    setDeferringTask(task);
    setIsDeferModalOpen(true);
  };

  const handleDeferTask = (reason: string) => {
    if (deferringTask) {
      moveTaskMutation.mutate({
        taskId: deferringTask.id,
        reason,
      });
    }
  };

  // Get timesheet data for each task
  const getTimesheetForTask = (taskId: number) => {
    return timesheets.find(ts => ts.task.id === taskId);
  };

  // Calculate total hours
  const totalLoggedHours = timesheets.reduce((sum, ts) => sum + ts.actualHours, 0);
  const totalPlannedHours = tasks.reduce((sum, task) => {
    const start = new Date(task.startTime);
    const end = new Date(task.endTime);
    return sum + ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  }, 0);

  if (!isToday) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <i className="fas fa-clock text-gray-300 text-4xl mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Timesheet Access Restricted</h3>
            <p className="text-gray-600">Timesheet entries can only be made for today's tasks.</p>
            <Button
              onClick={() => setSelectedDate(today)}
              className="mt-4"
            >
              Go to Today
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Status Banner */}
      <StatusBanner 
        taskPlanStatus={{
          submitted: submissionStatus?.submitted || false,
          submission: submissionStatus?.submission ? {
            submittedAt: submissionStatus.submission.submittedAt.toString()
          } : null
        }}
        timesheetStatus={{
          submitted: timesheetStatus?.submitted || false,
          submission: timesheetStatus?.submission ? {
            submittedAt: timesheetStatus.submission.submittedAt.toString()
          } : null
        }}
      />
      
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Daily Timesheet</h2>
            <p className="text-gray-600 mt-1">Log your actual work hours and task completion</p>
          </div>
          <div className="text-sm text-gray-600">
            Total Logged: <span className="font-semibold text-gray-900">{totalLoggedHours.toFixed(1)} hours</span>
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
          <CardTitle>Tasks for {format(selectedDate, 'EEEE, MMMM dd, yyyy')}</CardTitle>
        </CardHeader>
        
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-calendar-times text-gray-300 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks for Today</h3>
              <p className="text-gray-600">You haven't planned any tasks for today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Planned
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actual Hours
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {!timesheet ? (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleMarkFinished(task)}
                                disabled={createTimesheetMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <i className="fas fa-check-circle mr-1"></i>
                                Finish
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMoveToTomorrow(task)}
                                disabled={createTimesheetMutation.isPending}
                              >
                                <i className="fas fa-arrow-right mr-1"></i>
                                Move
                              </Button>
                            </div>
                          ) : (
                            <span className="text-gray-400">Completed</span>
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

      {/* Defer Task Modal */}
      <DeferModal
        isOpen={isDeferModalOpen}
        onClose={() => {
          setIsDeferModalOpen(false);
          setDeferringTask(null);
        }}
        onDefer={handleDeferTask}
        task={deferringTask}
        isPending={moveTaskMutation.isPending}
      />
    </div>
  );
}
