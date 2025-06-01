import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { apiRequest } from "@/lib/auth";
import TaskModal from "@/components/task/task-modal";
import TimeBasedCalendar from "@/components/calendar/time-based-calendar";
import type { TaskWithProject, Project, TaskPlanSubmission } from "@shared/schema";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null);
  const [dragTaskData, setDragTaskData] = useState<{ date: Date; startTime: Date; endTime: Date } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const todayString = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const { data: tasks = [] } = useQuery<TaskWithProject[]>({
    queryKey: ['/api/tasks', { startDate: weekStart.toISOString(), endDate: weekEnd.toISOString() }],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: submissionStatus } = useQuery<{ submitted: boolean; submission: TaskPlanSubmission | null }>({
    queryKey: ['/api/task-plans/status', { date: todayString }],
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

  const createTaskMutation = useMutation({
    mutationFn: (taskData: any) => apiRequest('POST', '/api/tasks', taskData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsTaskModalOpen(false);
      setEditingTask(null);
      setDragTaskData(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...taskData }: any) => apiRequest('PUT', `/api/tasks/${id}`, taskData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsTaskModalOpen(false);
      setEditingTask(null);
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
        description: "Task deleted successfully!",
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

  const handleSubmitPlan = () => {
    if (tasks.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one task before submitting your plan.",
        variant: "destructive",
      });
      return;
    }

    submitPlanMutation.mutate();
  };

  const handleDragTaskCreate = (date: Date, startTime: Date, endTime: Date) => {
    setDragTaskData({ date, startTime, endTime });
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: TaskWithProject) => {
    setEditingTask(task);
    setDragTaskData(null);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = (taskId: number) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleTaskModalSuccess = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
    setDragTaskData(null);
  };

  return (
    <div className="p-6">
      {/* Header with submission status */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Planning</h1>
          <p className="text-gray-600 mt-1">Plan and organize your weekly tasks</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Today</Button>
            <Button variant="outline" size="sm">Week</Button>
            <Button variant="outline" size="sm">+ Task</Button>
          </div>
          
          {submissionStatus?.submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-sm text-green-800 font-medium">Submitted</span>
            </div>
          ) : (
            <Button 
              onClick={handleSubmitPlan}
              disabled={submitPlanMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitPlanMutation.isPending ? "Submitting..." : "Submit Plan"}
            </Button>
          )}
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-0">
          <TimeBasedCalendar
            tasks={tasks}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onTaskEdit={handleEditTask}
            onTaskDelete={handleDeleteTask}
            onTaskCreate={handleDragTaskCreate}
          />
        </CardContent>
      </Card>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
          setDragTaskData(null);
        }}
        onSuccess={handleTaskModalSuccess}
        task={editingTask}
        projects={projects}
        defaultDate={dragTaskData?.date}
        defaultStartTime={dragTaskData?.startTime}
        defaultEndTime={dragTaskData?.endTime}
      />
    </div>
  );
}
