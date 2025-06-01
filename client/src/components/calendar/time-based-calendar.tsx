import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, setHours, setMinutes } from "date-fns";
import type { TaskWithProject } from "@shared/schema";

interface TimeBasedCalendarProps {
  tasks: TaskWithProject[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onTaskEdit: (task: TaskWithProject) => void;
  onTaskDelete: (taskId: number) => void;
  onTaskCreate: (date: Date, startTime: Date, endTime: Date) => void;
}

export default function TimeBasedCalendar({
  tasks,
  selectedDate,
  onDateChange,
  onTaskEdit,
  onTaskDelete,
  onTaskCreate,
}: TimeBasedCalendarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ date: Date; hour: number; minute: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ date: Date; hour: number; minute: number } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }); // Sunday
  const today = new Date();

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Generate hour slots (6 AM to 10 PM) with 30-minute intervals
  const timeSlots = [];
  for (let hour = 6; hour <= 22; hour++) {
    timeSlots.push({ hour, minute: 0 });
    timeSlots.push({ hour, minute: 30 });
  }

  // Snap time to 30-minute intervals
  const snapToInterval = (minute: number) => Math.round(minute / 30) * 30;

  // Group tasks by date and time
  const tasksByDateTime = tasks.reduce((acc, task) => {
    const dateKey = format(new Date(task.date), 'yyyy-MM-dd');
    const startTime = new Date(task.startTime);
    const hour = startTime.getHours();
    const key = `${dateKey}-${hour}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, TaskWithProject[]>);

  const isPastDate = (date: Date) => {
    return date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const getTaskStyle = (task: TaskWithProject) => {
    const startTime = new Date(task.startTime);
    const endTime = new Date(task.endTime);
    const duration = endTime.getTime() - startTime.getTime();
    const hours = duration / (1000 * 60 * 60);
    return {
      height: `${Math.max(hours * 60, 30)}px`, // Minimum 30px height
      top: `${(startTime.getMinutes() / 60) * 60}px`,
    };
  };

  const handleMouseDown = useCallback((date: Date, hour: number, minute: number, event: React.MouseEvent) => {
    if (isPastDate(date)) return;
    
    event.preventDefault();
    const snappedMinute = snapToInterval(minute);
    setDragStart({ date, hour, minute: snappedMinute });
    setDragEnd({ date, hour, minute: snappedMinute });
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((date: Date, hour: number, minute: number) => {
    if (!isDragging || !dragStart) return;
    
    const snappedMinute = snapToInterval(minute);
    setDragEnd({ date, hour, minute: snappedMinute });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStart || !dragEnd) return;

    // Create the task with the selected time range
    const startTime = setMinutes(setHours(dragStart.date, dragStart.hour), dragStart.minute);
    const endTime = setMinutes(setHours(dragEnd.date, dragEnd.hour), dragEnd.minute);
    
    // Ensure end time is after start time
    const finalStartTime = startTime < endTime ? startTime : endTime;
    const finalEndTime = startTime < endTime ? endTime : startTime;
    
    // Ensure minimum 30-minute duration
    const minDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
    const actualDuration = finalEndTime.getTime() - finalStartTime.getTime();
    
    if (actualDuration < minDuration) {
      const adjustedEndTime = new Date(finalStartTime.getTime() + minDuration);
      onTaskCreate(dragStart.date, finalStartTime, adjustedEndTime);
    } else {
      onTaskCreate(dragStart.date, finalStartTime, finalEndTime);
    }

    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, onTaskCreate]);

  // Add global mouse events
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Find the time slot under the mouse
      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (element && element.dataset.date && element.dataset.hour && element.dataset.minute) {
        const date = new Date(element.dataset.date);
        const hour = parseInt(element.dataset.hour);
        const minute = parseInt(element.dataset.minute);
        handleMouseMove(date, hour, minute);
      }
    };

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging, handleMouseUp, handleMouseMove]);

  // Check if a time slot is within the drag selection
  const isInDragSelection = (date: Date, hour: number, minute: number) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    
    if (!isSameDay(date, dragStart.date)) return false;
    
    const slotTime = hour * 60 + minute;
    const startTime = dragStart.hour * 60 + dragStart.minute;
    const endTime = dragEnd.hour * 60 + dragEnd.minute;
    
    const minTime = Math.min(startTime, endTime);
    const maxTime = Math.max(startTime, endTime);
    
    return slotTime >= minTime && slotTime <= maxTime;
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(subWeeks(selectedDate, 1))}
          >
            ← Previous Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(addWeeks(selectedDate, 1))}
          >
            Next Week →
          </Button>
        </div>
        <div className="text-lg font-semibold">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-8 border-b">
            {/* Time column header */}
            <div className="p-2 text-center font-medium bg-gray-50 border-r">
              Time
            </div>
            {/* Day headers */}
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`p-2 text-center font-medium border-r last:border-r-0 ${
                  isSameDay(day, today) ? 'bg-blue-50 text-blue-700' : 'bg-gray-50'
                }`}
              >
                <div className="text-sm text-gray-600">
                  {format(day, 'EEE')}
                </div>
                <div className="text-lg">
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="relative" ref={calendarRef}>
            {timeSlots.map(({ hour, minute }) => (
              <div key={`${hour}-${minute}`} className="grid grid-cols-8 border-b last:border-b-0">
                {/* Time label */}
                <div className="p-2 text-xs text-gray-600 border-r bg-gray-50 flex items-center">
                  {minute === 0 && format(setHours(new Date(), hour), 'h:mm a')}
                </div>
                
                {/* Day cells */}
                {weekDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const tasksInSlot = tasksByDateTime[`${dateKey}-${hour}`] || [];
                  const isSelected = isInDragSelection(day, hour, minute);
                  const isPast = isPastDate(day);
                  
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}-${minute}`}
                      className={`relative border-r last:border-r-0 h-8 ${
                        isPast 
                          ? 'bg-gray-100 cursor-not-allowed' 
                          : isSelected
                          ? 'bg-blue-200 cursor-crosshair'
                          : 'hover:bg-gray-50 cursor-crosshair'
                      }`}
                      data-date={day.toISOString()}
                      data-hour={hour}
                      data-minute={minute}
                      onMouseDown={(e) => handleMouseDown(day, hour, minute, e)}
                      onMouseEnter={() => handleMouseMove(day, hour, minute)}
                    >
                      {/* Tasks */}
                      {minute === 0 && tasksInSlot.map((task) => (
                        <div
                          key={task.id}
                          className="absolute left-1 right-1 z-10"
                          style={getTaskStyle(task)}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <div className="h-full w-full">
                                <Badge
                                  variant="secondary"
                                  className="h-full w-full flex items-center justify-center text-xs p-1 cursor-pointer hover:opacity-80 overflow-hidden"
                                  style={{ backgroundColor: task.project.color }}
                                >
                                  <div className="truncate">
                                    {task.title}
                                  </div>
                                </Badge>
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => onTaskEdit(task)}>
                                Edit Task
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onTaskDelete(task.id)}
                                className="text-red-600"
                              >
                                Delete Task
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drag instructions */}
      <div className="text-sm text-gray-600 text-center">
        Click and drag across time slots to create a new task
      </div>
    </div>
  );
}