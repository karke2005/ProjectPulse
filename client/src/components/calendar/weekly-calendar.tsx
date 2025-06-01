import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from "date-fns";
import type { TaskWithProject } from "@shared/schema";

interface WeeklyCalendarProps {
  tasks: TaskWithProject[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onTaskEdit: (task: TaskWithProject) => void;
  onTaskDelete: (taskId: number) => void;
  onTaskCreate: (date: Date) => void;
  isSubmitted?: boolean;
}

export default function WeeklyCalendar({
  tasks,
  selectedDate,
  onDateChange,
  onTaskEdit,
  onTaskDelete,
  onTaskCreate,
  isSubmitted = false,
}: WeeklyCalendarProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }); // Sunday
  const today = new Date();

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group tasks by date
  const tasksByDate = tasks.reduce((acc, task) => {
    const dateKey = format(new Date(task.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
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

  const canEditTask = (task: TaskWithProject) => {
    return !isPastDate(new Date(task.date)) && !isSubmitted;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Weekly Calendar</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousWeek}
            >
              <i className="fas fa-chevron-left mr-1"></i>
              Previous
            </Button>
            <Button
              size="sm"
              onClick={handleToday}
              className="bg-primary hover:bg-primary/90"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextWeek}
            >
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
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day.slice(0, 3)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate[dateKey] || [];
            const isToday = isSameDay(day, today);
            const isPast = isPastDate(day);
            const isSelected = isSameDay(day, selectedDate);

            return (
              <div
                key={dateKey}
                className={`h-32 border border-gray-200 rounded-lg p-2 cursor-pointer transition-all ${
                  isToday 
                    ? 'bg-primary-50 border-primary-200' 
                    : isSelected
                    ? 'bg-blue-50 border-blue-200'
                    : isPast
                    ? 'bg-gray-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onDateChange(day)}
              >
                <div className={`text-sm font-medium mb-2 ${
                  isToday 
                    ? 'text-primary' 
                    : isPast 
                    ? 'text-gray-400' 
                    : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                  {isToday && (
                    <span className="ml-1 text-xs bg-primary text-white px-1 rounded">
                      Today
                    </span>
                  )}
                </div>
                
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <DropdownMenu key={task.id}>
                      <DropdownMenuTrigger asChild>
                        <div
                          className="text-xs px-2 py-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: `${task.project.color}20`,
                            color: task.project.color,
                            border: `1px solid ${task.project.color}40`,
                          }}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => onTaskEdit(task)}
                          disabled={!canEditTask(task)}
                        >
                          <i className="fas fa-edit mr-2"></i>
                          Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onTaskDelete(task.id)}
                          disabled={!canEditTask(task)}
                          className="text-red-600"
                        >
                          <i className="fas fa-trash mr-2"></i>
                          Delete Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ))}
                  
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 px-2 py-1">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                  
                  {dayTasks.length === 0 && !isPast && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskCreate(day);
                      }}
                      className="w-full text-xs text-gray-400 border-2 border-dashed border-gray-300 rounded px-2 py-1 hover:border-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <i className="fas fa-plus mr-1"></i>
                      Add task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Day Tasks */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Tasks for {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
          </h4>
          
          <div className="space-y-2">
            {tasksByDate[format(selectedDate, 'yyyy-MM-dd')]?.length ? (
              tasksByDate[format(selectedDate, 'yyyy-MM-dd')].map((task) => (
                <div key={task.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: task.project.color }}
                  ></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    <div className="text-xs text-gray-500">
                      {task.project.name} • {format(new Date(task.startTime), 'h:mm a')} - {format(new Date(task.endTime), 'h:mm a')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {((new Date(task.endTime).getTime() - new Date(task.startTime).getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                  </div>
                  {canEditTask(task) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="ml-2">
                          <i className="fas fa-ellipsis-v"></i>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onTaskEdit(task)}>
                          <i className="fas fa-edit mr-2"></i>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onTaskDelete(task.id)}
                          className="text-red-600"
                        >
                          <i className="fas fa-trash mr-2"></i>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <i className="fas fa-calendar-plus text-gray-300 text-3xl mb-2"></i>
                <p className="text-gray-500 text-sm">No tasks for this day</p>
                {!isPastDate(selectedDate) && (
                  <Button
                    onClick={() => onTaskCreate(selectedDate)}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Add Task
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
