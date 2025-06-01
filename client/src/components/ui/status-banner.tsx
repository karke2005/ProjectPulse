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
}

export function StatusBanner({ taskPlanStatus, timesheetStatus }: StatusBannerProps) {
  const today = new Date();
  const isAfterDeadline = today.getHours() >= 19; // 7 PM deadline

  return (
    <div className="space-y-3 mb-6">
      {/* Task Plan Status */}
      {taskPlanStatus.submitted ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
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
            {isAfterDeadline 
              ? "Task plan not submitted - overdue!"
              : "Task plan not submitted - please submit before 7:00 PM today"
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
        ) : (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Timesheet pending - please submit your hours for today
            </AlertDescription>
          </Alert>
        )
      )}
    </div>
  );
}