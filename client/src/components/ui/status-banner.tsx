import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

interface StatusBannerProps {
  taskPlanStatus: {
    submitted: boolean;
    submission?: {
      submittedAt: string;
    } | null;
  };
  timesheetStatus?: {
    submitted: boolean;
    submission?: {
      submittedAt: string;
    } | null;
  };
  yesterdayTimesheetStatus?: {
    submitted: boolean;
    submission?: {
      submittedAt: string;
    } | null;
  };
}

export function StatusBanner({ taskPlanStatus, timesheetStatus, yesterdayTimesheetStatus }: StatusBannerProps) {
  const today = new Date();
  const currentHour = today.getHours();
  const isAfterTaskDeadline = currentHour >= 11; // 11 AM deadline for task plans
  const isAfterTimesheetTime = currentHour >= 19; // 7 PM for timesheet notifications

  return (
    <div className="space-y-3 mb-6">
      {/* Task Plan Status */}
      {taskPlanStatus.submitted ? (
        <Alert className="border-green-100 bg-green-25">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">
            Task plan submitted on{" "}
            {taskPlanStatus.submission?.submittedAt 
              ? format(new Date(taskPlanStatus.submission.submittedAt), "MMM d, yyyy 'at' h:mm a")
              : "today"
            }
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isAfterTaskDeadline 
              ? "Task plan not submitted - overdue!"
              : "Task plan not submitted - please submit before 11:00 AM today"
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Timesheet Status */}
      {timesheetStatus && (
        timesheetStatus.submitted ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Timesheet submitted on{" "}
              {timesheetStatus.submission?.submittedAt 
                ? format(new Date(timesheetStatus.submission.submittedAt), "MMM d, yyyy 'at' h:mm a")
                : "today"
              }
            </AlertDescription>
          </Alert>
        ) : isAfterTimesheetTime ? (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Timesheet pending - please submit your hours for today
            </AlertDescription>
          </Alert>
        ) : null
      )}

      {/* Yesterday Timesheet Status */}
      {yesterdayTimesheetStatus && !yesterdayTimesheetStatus.submitted && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Please submit yesterday timesheet
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}