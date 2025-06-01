import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { apiRequest } from "@/lib/auth";
import TaskModal from "@/components/task/task-modal";
import WeeklyCalendar from "@/components/calendar/weekly-calendar";
import TimeBasedCalendar from "@/components/calendar/time-based-calendar";
import { StatusBanner } from "@/components/ui/status-banner";
import type { TaskWithProject, Project, TaskPlanSubmission } from "@shared/schema";

export default function TaskPlanning() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null);
  const [calendarView, setCalendarView] = useState<'overview' | 'timeline'>('timeline');
  const [dragTaskData, setDragTaskData] = useState<{ date: Date; startTime: Date; endTime: Date } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const todayString = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []); // Stable date string

  const { data: tasks = [] } = useQuery<TaskWithProject[]>({
    queryKey: ['/api/tasks', { startDate: weekStart.toISOString(), endDate: weekEnd.toISOString() }],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: submissionStatus } = useQuery<{ submitted: boolean; submission: TaskPlanSubmission | null }>({
    queryKey: ['/api/task-plans/status', { date: todayString }],
  });

  const { data: timesheetStatus } = useQuery({
    queryKey: ['/api/timesheets/status', { date: todayString }],
  });

  const submitPlanMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/task-plans/submit', { date: todayString }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task plan submitted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/task-plans/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => apiRequest('DELETE', `/api/tasks/${taskId}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTaskCreated = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
    setDragTaskData(null);
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
  };

  const handleDragTaskCreate = (date: Date, startTime: Date, endTime: Date) => {
    setDragTaskData({ date, startTime, endTime });
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: TaskWithProject) => {
    // Check if task date is in the past (excluding today)
    const taskDate = new Date(task.date);
    const today = new Date();
    taskDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    if (taskDate < today) {
      toast({
        title: "Cannot Edit",
        description: "Tasks from past dates cannot be edited",
        variant: "destructive",
      });
      return;
    }
    
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleSubmitPlan = () => {
    const todayTasks = tasks.filter(task => {
      const taskDate = new Date(task.date);
      const today = new Date();
      return format(taskDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    });

    if (todayTasks.length === 0) {
      toast({
        title: "No Tasks",
        description: "Please add tasks for today before submitting your plan",
        variant: "destructive",
      });
      return;
    }

    submitPlanMutation.mutate();
  };

  // Calculate stats
  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.date);
    return format(taskDate, 'yyyy-MM-dd') === todayString;
  });

  const weekTasks = tasks.length;
  const totalProjects = new Set(tasks.map(task => task.projectId)).size;
  const totalHours = tasks.reduce((sum, task) => {
    const start = new Date(task.startTime);
    const end = new Date(task.endTime);
    return sum + ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  }, 0);

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
            <h2 className="text-2xl font-bold text-gray-900">Task Planning</h2>
            <p className="text-gray-600 mt-1">Plan and organize your weekly tasks</p>
          </div>
          <div className="flex space-x-2">
            <div className="flex items-center bg-gray-100 rounded-md p-0.5">
              <Button
                variant={calendarView === 'overview' ? 'default' : 'ghost'}
                className="text-xs px-2 py-1 h-6"
                onClick={() => setCalendarView('overview')}
              >
                Today
              </Button>
              <Button
                variant={calendarView === 'timeline' ? 'default' : 'ghost'}
                className="text-xs px-2 py-1 h-6"
                onClick={() => setCalendarView('timeline')}
              >
                Week
              </Button>
            </div>
            <Button
              onClick={() => {
                setEditingTask(null);
                setDragTaskData(null);
                setIsTaskModalOpen(true);
              }}
              disabled={submissionStatus?.submitted}
              className="bg-primary text-white hover:bg-primary/90 text-xs px-3 py-1 h-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Task
            </Button>
            <Button
              onClick={handleSubmitPlan}
              disabled={submissionStatus?.submitted || submitPlanMutation.isPending}
              variant={submissionStatus?.submitted ? "secondary" : "default"}
              className="text-xs px-3 py-1 h-6"
            >
              {submissionStatus?.submitted ? "Submitted" : "Submit Plan"}
            </Button>
          </div>
        </div>
      </div>



      {/* Calendar Views */}
      {calendarView === 'overview' ? (
        <WeeklyCalendar
          tasks={tasks}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onTaskEdit={submissionStatus?.submitted ? () => {} : handleEditTask}
          onTaskDelete={submissionStatus?.submitted ? () => {} : handleDeleteTask}
          onTaskCreate={submissionStatus?.submitted ? () => {} : (date) => {
            setSelectedDate(date);
            setEditingTask(null);
            setDragTaskData(null);
            setIsTaskModalOpen(true);
          }}
        />
      ) : (
        <TimeBasedCalendar
          tasks={tasks}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onTaskEdit={submissionStatus?.submitted ? () => {} : handleEditTask}
          onTaskDelete={submissionStatus?.submitted ? () => {} : handleDeleteTask}
          onTaskCreate={submissionStatus?.submitted ? () => {} : handleDragTaskCreate}
        />
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSuccess={handleTaskCreated}
        task={editingTask}
        projects={projects}
        defaultDate={dragTaskData?.date || new Date()}
        defaultStartTime={dragTaskData?.startTime}
        defaultEndTime={dragTaskData?.endTime}
      />
    </div>
  );
}
