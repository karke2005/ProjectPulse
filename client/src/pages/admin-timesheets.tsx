import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import type { TimesheetWithTask } from "@shared/schema";

export default function AdminTimesheets() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetWithTask | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: timesheets = [], isLoading } = useQuery<TimesheetWithTask[]>({
    queryKey: ['/api/admin/timesheets', { date: format(selectedDate, 'yyyy-MM-dd'), status: statusFilter }],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  const approveMutation = useMutation({
    mutationFn: (timesheetId: number) => apiRequest('PUT', `/api/admin/timesheets/${timesheetId}/approve`, {}),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timesheet approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/timesheets'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ timesheetId, reason }: { timesheetId: number; reason: string }) => 
      apiRequest('PUT', `/api/admin/timesheets/${timesheetId}/reject`, { reason }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timesheet rejected successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/timesheets'] });
      setSelectedTimesheet(null);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (timesheetId: number) => {
    approveMutation.mutate(timesheetId);
  };

  const handleReject = () => {
    if (!selectedTimesheet || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ timesheetId: selectedTimesheet.id, reason: rejectionReason });
  };

  const getUserInfo = (userId: number) => {
    const user = users.find((u: any) => u.id === userId);
    return user ? { username: user.username, email: user.email } : { username: `User ${userId}`, email: '' };
  };

  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/admin'}
              >
                ← Back to Admin
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Timesheet Approvals</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/profile'}
              >
                Profile
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/admin'}
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Review Employee Timesheets</h2>
            <p className="text-gray-600 mt-1">Approve or reject timesheet submissions</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </select>
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
                <i className="fas fa-file-alt text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Timesheets</p>
                <p className="text-2xl font-bold text-gray-900">{timesheets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <i className="fas fa-clock text-yellow-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  {timesheets.filter(t => t.approvalStatus === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <i className="fas fa-check text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {timesheets.filter(t => t.approvalStatus === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timesheets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Timesheets for {format(selectedDate, 'EEEE, MMMM dd, yyyy')}</CardTitle>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading timesheets...</p>
            </div>
          ) : timesheets.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-file-alt text-gray-300 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No timesheets found</h3>
              <p className="text-gray-600">No timesheets match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours Logged
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
                  {timesheets.map((timesheet) => (
                    <tr key={timesheet.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getUserInfo(timesheet.userId).username}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getUserInfo(timesheet.userId).email}
                        </div>
                        <div className="text-sm text-gray-500">
                          Submitted: {format(new Date(timesheet.createdAt), 'MMM dd, hh:mm a')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{timesheet.task.title}</div>
                        <div className="text-sm text-gray-500">{timesheet.task.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          style={{ 
                            backgroundColor: `${timesheet.task.project.color}20`,
                            color: timesheet.task.project.color 
                          }}
                        >
                          {timesheet.task.project.name}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {timesheet.actualHours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getApprovalStatusBadge(timesheet.approvalStatus)}
                        {timesheet.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1">{timesheet.rejectionReason}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {timesheet.approvalStatus === 'pending' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(timesheet.id)}
                              disabled={approveMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedTimesheet(timesheet)}
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  Reject
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject Timesheet</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p className="text-sm text-gray-600">
                                    Please provide a reason for rejecting this timesheet:
                                  </p>
                                  <Textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Enter rejection reason..."
                                    rows={3}
                                  />
                                  <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setSelectedTimesheet(null)}>
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={handleReject}
                                      disabled={rejectMutation.isPending || !rejectionReason.trim()}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}