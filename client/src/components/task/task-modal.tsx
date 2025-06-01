import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertTaskSchema, type TaskWithProject, type Project } from "@shared/schema";
import { apiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { z } from "zod";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  projectId: z.number().min(1, "Project is required"),
  date: z.string(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task?: TaskWithProject | null;
  projects: Project[];
  defaultDate?: Date;
  defaultStartTime?: Date;
  defaultEndTime?: Date;
}

export default function TaskModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  task, 
  projects, 
  defaultDate = new Date(),
  defaultStartTime,
  defaultEndTime
}: TaskModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditing = !!task;

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      projectId: 0,
      userId: 0,
      startTime: "09:00",
      endTime: "10:00",
      date: defaultDate.toISOString(),
    },
  });

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      console.log('TaskModal useEffect - Props received:', {
        task: !!task,
        defaultDate: defaultDate?.toISOString(),
        defaultStartTime: defaultStartTime?.toLocaleTimeString(),
        defaultEndTime: defaultEndTime?.toLocaleTimeString()
      });
      
      if (task) {
        // Editing existing task
        const taskDate = new Date(task.date);
        const startTime = new Date(task.startTime);
        const endTime = new Date(task.endTime);
        
        form.reset({
          title: task.title,
          description: task.description || "",
          projectId: task.projectId,
          userId: task.userId,
          startTime: format(startTime, "HH:mm"),
          endTime: format(endTime, "HH:mm"),
          date: taskDate.toISOString(),
        });
      } else {
        // Creating new task
        const startTimeStr = defaultStartTime ? format(defaultStartTime, "HH:mm") : "09:00";
        const endTimeStr = defaultEndTime ? format(defaultEndTime, "HH:mm") : "10:00";
        
        console.log('Setting form times:', {
          startTimeStr,
          endTimeStr,
          defaultStartTime: defaultStartTime?.toLocaleTimeString(),
          defaultEndTime: defaultEndTime?.toLocaleTimeString()
        });
        

        form.reset({
          title: "",
          description: "",
          projectId: projects[0]?.id || 1,
          userId: user?.id || 1,
          startTime: startTimeStr,
          endTime: endTimeStr,
          date: defaultDate.toISOString(),
        });
      }
    }
  }, [isOpen, task, defaultDate, defaultStartTime, defaultEndTime, form]);

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/tasks', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      onSuccess();
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
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/tasks/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    // Validate required fields
    if (!data.title || !data.projectId) {
      toast({
        title: "Validation Error",
        description: "Title and project are required",
        variant: "destructive",
      });
      return;
    }

    // Always use today's date for new tasks
    const today = new Date();
    const taskDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const startDateTime = new Date(taskDate);
    const endDateTime = new Date(taskDate);
    
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    
    startDateTime.setHours(startHour, startMinute, 0, 0);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    const taskData = {
      title: data.title,
      description: data.description || null,
      projectId: Number(data.projectId),
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      date: taskDate.toISOString(),
    };

    console.log('Submitting task data:', taskData);

    if (isEditing && task) {
      updateTaskMutation.mutate({ id: task.id, data: taskData });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const isPending = createTaskMutation.isPending || updateTaskMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Task" : "Create New Task"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter task title" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select 
                    value={field.value?.toString()} 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: project.color }}
                            ></div>
                            {project.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add task description..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {isPending 
                  ? (isEditing ? "Updating..." : "Creating...") 
                  : (isEditing ? "Update Task" : "Create Task")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
