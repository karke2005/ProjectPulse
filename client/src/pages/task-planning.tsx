import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { apiRequest } from "@/lib/auth";
import TaskModal from "@/components/task/task-modal";
import WeeklyCalendar from "@/components/calendar/weekly-calendar";
import TimeBasedCalendar from "@/components/calendar/time-based-calendar";
import type { TaskWithProject, Project, TaskPlanSubmission } from "@shared/schema";

export default function TaskPlanning() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null);
  const [calendarView, setCalendarView] = useState<'overview' | 'timeline'>('timeline');
  const [dragTaskData, setDragTaskData] = useState<{ date: Date; startTime: Date; endTime: Date } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const today = new Date();

  const { data: tasks = [] } = useQuery<TaskWithProject[]>({
    queryKey: ['/api/tasks', { startDate: weekStart.toISOString(), endDate: weekEnd.toISOString() }],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: submissionStatus } = useQuery<{ submitted: boolean; submission: TaskPlanSubmission | null }>({
    queryKey: ['/api/task-plans/status', { date: today.toISOString() }],
  });

  const submitPlanMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/task-plans/submit', { date: today.toISOString() }),
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
    console.log('Setting drag task data:', {
      date: date.toISOString(),
      startTime: startTime.toLocaleTimeString(),
      endTime: endTime.toLocaleTimeString()
    });
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
    return format(taskDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
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
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Task Planning</h2>
            <p className="text-gray-600 mt-1">Plan and organize your weekly tasks</p>
          </div>
          <div className="flex space-x-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={calendarView === 'overview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCalendarView('overview')}
              >
                Overview
              </Button>
              <Button
                variant={calendarView === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCalendarView('timeline')}
              >
                Timeline
              </Button>
            </div>
            <Button
              onClick={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <i className="fas fa-plus mr-2"></i>
              New Task
            </Button>
            <Button
              onClick={handleSubmitPlan}
              disabled={submissionStatus?.submitted || submitPlanMutation.isPending}
              variant={submissionStatus?.submitted ? "secondary" : "default"}
            >
              <i className="fas fa-paper-plane mr-2"></i>
              {submissionStatus?.submitted ? "Plan Submitted" : "Submit Plan"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary-50 rounded-lg">
                <i className="fas fa-calendar-check text-primary"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{todayTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg">
                <i className="fas fa-calendar-week text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">{weekTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <i className="fas fa-project-diagram text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Projects</p>
                <p className="text-2xl font-bold text-gray-900">{totalProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-50 rounded-lg">
                <i className="fas fa-clock text-purple-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Planned Hours</p>
                <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Views */}
      {calendarView === 'overview' ? (
        <WeeklyCalendar
          tasks={tasks}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onTaskEdit={handleEditTask}
          onTaskDelete={handleDeleteTask}
          onTaskCreate={(date) => {
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
          onTaskEdit={handleEditTask}
          onTaskDelete={handleDeleteTask}
          onTaskCreate={handleDragTaskCreate}
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
        defaultDate={dragTaskData?.date || selectedDate}
        defaultStartTime={dragTaskData?.startTime}
        defaultEndTime={dragTaskData?.endTime}
      />
    </div>
  );
}
