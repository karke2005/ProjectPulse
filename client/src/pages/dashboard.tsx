import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import type { TaskWithProject, TaskPlanSubmission } from "@shared/schema";

export default function Dashboard() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

  const { data: tasks = [] } = useQuery<TaskWithProject[]>({
    queryKey: ['/api/tasks', { startDate: weekStart.toISOString(), endDate: weekEnd.toISOString() }],
  });

  const { data: todayTasks = [] } = useQuery<TaskWithProject[]>({
    queryKey: ['/api/tasks', { date: today.toISOString() }],
  });

  const { data: submissionStatus } = useQuery<{ submitted: boolean; submission: TaskPlanSubmission | null }>({
    queryKey: ['/api/task-plans/status', { date: today.toISOString() }],
  });

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = 0; // This would come from timesheet data
  const inProgressTasks = todayTasks.length;
  const totalHours = 0; // This would come from timesheet data

  // Group tasks by date for calendar view
  const tasksByDate = tasks.reduce((acc, task) => {
    const dateKey = format(new Date(task.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, TaskWithProject[]>);

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600 mt-1">Overview of your tasks and projects</p>
          </div>
          
          {!submissionStatus?.submitted && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle text-orange-600 mr-2"></i>
                <span className="text-sm text-orange-800">Task plan not submitted for today</span>
              </div>
            </div>
          )}
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
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <i className="fas fa-check-circle text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-50 rounded-lg">
                <i className="fas fa-clock text-orange-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-2xl font-bold text-gray-900">{inProgressTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg">
                <i className="fas fa-hourglass text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar and Today's Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Weekly Calendar</CardTitle>
                <span className="text-sm text-gray-600">
                  {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                </span>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayTasks = tasksByDate[dateKey] || [];
                  const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                  
                  return (
                    <div
                      key={dateKey}
                      className={`h-24 border border-gray-100 rounded-lg p-2 cursor-pointer transition-colors ${
                        isToday 
                          ? 'bg-primary-50 border-primary-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-primary' : 'text-gray-900'
                      }`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayTasks.slice(0, 2).map((task) => (
                          <div
                            key={task.id}
                            className="text-xs px-2 py-1 rounded truncate"
                            style={{
                              backgroundColor: `${task.project.color}20`,
                              color: task.project.color,
                            }}
                          >
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-xs text-gray-500">+{dayTasks.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Today's Tasks */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Today's Tasks</CardTitle>
              <p className="text-sm text-gray-600">{format(today, 'EEEE, MMM dd, yyyy')}</p>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {todayTasks.length === 0 ? (
                  <div className="text-center py-6">
                    <i className="fas fa-calendar-plus text-gray-300 text-3xl mb-2"></i>
                    <p className="text-gray-500">No tasks for today</p>
                  </div>
                ) : (
                  todayTasks.map((task) => (
                    <div key={task.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100">
                      <div 
                        className="w-2 h-2 rounded-full mt-2"
                        style={{ backgroundColor: task.project.color }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {task.project.name} • {format(new Date(task.startTime), 'h:mm a')} - {format(new Date(task.endTime), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
