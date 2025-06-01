import { useLocation } from "wouter";
import TaskPlanning from "./task-planning";

export default function Dashboard() {
  const [, navigate] = useLocation();
  
  // Redirect to task planning which is the main calendar interface for users
  return <TaskPlanning />;
}
