import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Users, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { User, RegisterData } from "@shared/schema";

export default function AdminUsers() {
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "employee",
      notificationEmail: "",
      timesheetReminderTime: "",
    },
  });

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <i className="fas fa-lock text-gray-300 text-4xl mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You need admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const resetUsersMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/admin/reset-users'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User data reset successfully (admin preserved)",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: RegisterData) => apiRequest('POST', '/api/users', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowUserForm(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => 
      apiRequest('PUT', `/api/users/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterData) => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        data: {
          username: data.username,
          email: data.email,
          role: data.role,
          notificationEmail: data.notificationEmail || null,
          timesheetReminderTime: data.timesheetReminderTime || null,
        }
      });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      email: user.email,
      password: "",
      confirmPassword: "",
      role: user.role,
      notificationEmail: user.notificationEmail || "",
      timesheetReminderTime: user.timesheetReminderTime || "",
    });
    setShowUserForm(true);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    form.reset();
    setShowUserForm(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="h-6 w-6 mr-2" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">Manage system users and permissions</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Logged in as: <span className="font-medium">{user?.username}</span>
          </div>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
          <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
            <DialogTrigger asChild>
              <Button onClick={handleAddUser}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Edit User' : 'Add New User'}
                </DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!editingUser && (
                    <>
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notificationEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notification Email (Optional)</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="timesheetReminderTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timesheet Reminder Time (Optional)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowUserForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createUserMutation.isPending || updateUserMutation.isPending}
                      className="flex-1"
                    >
                      {createUserMutation.isPending || updateUserMutation.isPending
                        ? "Saving..."
                        : editingUser
                        ? "Update User"
                        : "Create User"
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>System Users ({users.length})</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetUsersMutation.mutate()}
              disabled={resetUsersMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              {resetUsersMutation.isPending ? "Resetting..." : "Reset All Users"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((userItem) => (
              <div
                key={userItem.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700">
                          {userItem.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {userItem.username}
                        </p>
                        <Badge variant={userItem.role === 'admin' ? 'default' : 'secondary'}>
                          {userItem.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{userItem.email}</p>
                      {userItem.notificationEmail && (
                        <p className="text-xs text-gray-400">
                          Notifications: {userItem.notificationEmail}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUser(userItem)}
                    disabled={userItem.id === user?.id && userItem.role === 'admin'}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {users.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}