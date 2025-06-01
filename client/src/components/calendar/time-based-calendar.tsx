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

  // Generate hour slots (6 AM to 10 PM)
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);

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

  const handlePreviousWeek = () => {
    onDateChange(subWeeks(selectedDate, 1));
  };

  const handleNextWeek = () => {
    onDateChange(addWeeks(selectedDate, 1));
  };

  const handleToday = () => {
    onDateChange(today);
  };

  const isPastDate = (date: Date) => {
    const dateOnly = new Date(date);
    const todayOnly = new Date(today);
    dateOnly.setHours(0, 0, 0, 0);
    todayOnly.setHours(0, 0, 0, 0);
    return dateOnly < todayOnly;
  };

  const getTimeSlotPosition = (event: React.MouseEvent, dayIndex: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const hourHeight = 60; // 60px per hour
    const hour = Math.floor(y / hourHeight) + 6; // Starting at 6 AM
    const minute = Math.round((y % hourHeight) / hourHeight * 60 / 15) * 15; // 15-minute intervals
    
    const date = weekDays[dayIndex];
    return { date, hour: Math.min(Math.max(hour, 6), 21), minute: Math.min(minute, 45) };
  };

  const getTimeSlotFromContainer = (event: React.MouseEvent) => {
    const calendarContainer = calendarRef.current;
    if (!calendarContainer) return null;

    const rect = calendarContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate which day column (skip first column which is time labels)
    const columnWidth = rect.width / 8; // 8 columns total (1 time + 7 days)
    const dayIndex = Math.floor(x / columnWidth) - 1; // -1 to skip time column
    
    if (dayIndex < 0 || dayIndex >= 7) return null;
    
    const hourHeight = 60; // 60px per hour
    const hour = Math.floor(y / hourHeight) + 6; // Starting at 6 AM
    const minuteProgress = (y % hourHeight) / hourHeight; // 0 to 1 progress within the hour
    const minute = Math.floor(minuteProgress * 60); // Convert to exact minute
    
    const date = weekDays[dayIndex];
    return { 
      date, 
      hour: Math.min(Math.max(hour, 6), 21), 
      minute: Math.min(Math.max(minute, 0), 59) 
    };
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    const position = getTimeSlotFromContainer(event);
    if (position && !isPastDate(position.date)) {
      setIsDragging(true);
      setDragStart(position);
      setDragEnd(position);
    }
  };

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    
    const position = getTimeSlotFromContainer(event);
    if (position) {
      setDragEnd(position);
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStart || !dragEnd) return;
    
    setIsDragging(false);
    
    // Create the task with the selected time range
    const startTime = setMinutes(setHours(dragStart.date, dragStart.hour), dragStart.minute);
    const endTime = setMinutes(setHours(dragEnd.date, dragEnd.hour), dragEnd.minute);
    

    
    // Ensure end time is after start time
    const finalStartTime = startTime < endTime ? startTime : endTime;
    const finalEndTime = startTime < endTime ? endTime : startTime;
    
    // Minimum 30 minutes
    if (finalEndTime.getTime() - finalStartTime.getTime() < 30 * 60 * 1000) {
      const newEndTime = new Date(finalStartTime.getTime() + 30 * 60 * 1000);
      onTaskCreate(dragStart.date, finalStartTime, newEndTime);
    } else {
      onTaskCreate(dragStart.date, finalStartTime, finalEndTime);
    }
    
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, onTaskCreate]);

  // Add global mouse up listener
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseUp]);

  const isInDragSelection = (dayIndex: number, hour: number) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    
    const day = weekDays[dayIndex];
    const startDay = dragStart.date;
    const endDay = dragEnd.date;
    const startHour = dragStart.hour;
    const endHour = dragEnd.hour;
    
    // Only highlight if we're on the same day as the drag
    if (!isSameDay(day, startDay)) return false;
    
    // Highlight the full range between start and end hours
    const minHour = Math.min(startHour, endHour);
    const maxHour = Math.max(startHour, endHour);
    
    return hour >= minHour && hour <= maxHour;
  };

  const getTaskStyle = (task: TaskWithProject) => {
    const startTime = new Date(task.startTime);
    const endTime = new Date(task.endTime);
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours
    
    const top = (startHour - 6) * 60 + (startMinute * 60 / 60); // px from top
    const height = duration * 60; // px height
    
    return {
      position: 'absolute' as const,
      top: `${top}px`,
      height: `${height}px`,
      left: '2px',
      right: '2px',
      backgroundColor: `${task.project.color}20`,
      border: `2px solid ${task.project.color}`,
      borderRadius: '4px',
      padding: '2px 4px',
      fontSize: '12px',
      overflow: 'hidden',
      zIndex: 10,
      cursor: 'pointer',
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Time-Based Weekly Calendar</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
              <i className="fas fa-chevron-left mr-1"></i>
              Previous
            </Button>
            <Button size="sm" onClick={handleToday} className="bg-primary hover:bg-primary/90">
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextWeek}>
              Next
              <i className="fas fa-chevron-right ml-1"></i>
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-xs text-gray-500 mb-4">
          Click and drag to create tasks • Past dates are read-only
        </div>
        
        {/* Calendar Grid */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Header with days */}
          <div className="grid grid-cols-8 bg-gray-50">
            <div className="p-2 text-xs font-medium text-gray-500 border-r border-gray-200">
              Time
            </div>
            {weekDays.map((day, index) => {
              const isToday = isSameDay(day, today);
              const isPast = isPastDate(day);
              
              return (
                <div
                  key={index}
                  className={`p-2 text-center border-r border-gray-200 ${
                    isToday ? 'bg-primary-50 text-primary font-medium' : 
                    isPast ? 'text-gray-400' : 'text-gray-900'
                  }`}
                >
                  <div className="text-xs font-medium">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-sm ${isToday ? 'font-bold' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time slots */}
          <div 
            ref={calendarRef}
            className="relative"
          >
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
                {/* Time label */}
                <div className="p-2 text-xs text-gray-500 border-r border-gray-200 bg-gray-50">
                  {format(setHours(new Date(), hour), 'h a')}
                </div>
                
                {/* Day columns */}
                {weekDays.map((day, dayIndex) => {
                  const isPast = isPastDate(day);
                  const isSelected = isInDragSelection(dayIndex, hour);
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const tasksInSlot = tasksByDateTime[`${dateKey}-${hour}`] || [];
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`relative h-15 border-r border-gray-200 ${
                        isPast ? 'bg-gray-50 cursor-not-allowed' : 'cursor-crosshair hover:bg-blue-50'
                      } ${isSelected ? 'bg-primary-100' : ''}`}
                      style={{ height: '60px' }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                    >
                      {/* Render tasks in this time slot */}
                      {tasksInSlot.map((task) => (
                        <DropdownMenu key={task.id}>
                          <DropdownMenuTrigger asChild>
                            <div
                              style={getTaskStyle(task)}
                              title={task.title}
                            >
                              <div className="font-medium truncate" style={{ color: task.project.color }}>
                                {task.title}
                              </div>
                              <div className="text-xs opacity-75 truncate">
                                {format(new Date(task.startTime), 'h:mm')} - {format(new Date(task.endTime), 'h:mm a')}
                              </div>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={() => onTaskEdit(task)}
                              disabled={isPast}
                            >
                              <i className="fas fa-edit mr-2"></i>
                              Edit Task
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onTaskDelete(task.id)}
                              disabled={isPast}
                              className="text-red-600"
                            >
                              <i className="fas fa-trash mr-2"></i>
                              Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Drag overlay */}
        {isDragging && dragStart && dragEnd && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <div className="absolute bg-primary-200 border-2 border-primary rounded opacity-75"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}