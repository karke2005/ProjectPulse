import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: "Task Planning", href: "/task-planning", icon: "fas fa-calendar-alt" },
  { name: "Timesheet", href: "/timesheet", icon: "fas fa-clock" },
];

const adminNavigation = [
  { name: "Admin Dashboard", href: "/admin", icon: "fas fa-users-cog" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    return href === "/" ? location === "/" : location.startsWith(href);
  };

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-project-diagram text-white text-sm"></i>
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900">Projects App</span>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {user?.role !== 'admin' && navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <div
                  className={`${
                    isActive(item.href)
                      ? 'bg-primary-50 border-r-2 border-primary text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-l-md cursor-pointer`}
                >
                  <i className={`${item.icon} ${
                    isActive(item.href) ? 'text-primary' : 'text-gray-400'
                  } mr-3 text-sm`}></i>
                  {item.name}
                </div>
              </Link>
            ))}
          </nav>
          
          {/* Admin Section */}
          {user?.role === 'admin' && (
            <div className="px-2 mt-6">
              <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administration
              </h3>
              <nav className="mt-2 space-y-1">
                {adminNavigation.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <div
                      className={`${
                        isActive(item.href)
                          ? 'bg-primary-50 border-r-2 border-primary text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-l-md cursor-pointer`}
                    >
                      <i className={`${item.icon} ${
                        isActive(item.href) ? 'text-primary' : 'text-gray-400'
                      } mr-3 text-sm`}></i>
                      {item.name}
                    </div>
                  </Link>
                ))}
              </nav>
            </div>
          )}
          
          <Separator className="my-4" />
          
          {/* User Profile */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center group w-full">
              <div>
                <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">{user?.username}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-sign-out-alt text-sm"></i>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
