import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import type { TaskWithProject } from "@shared/schema";

const deferFormSchema = z.object({
  reason: z.string().min(1, "Please provide a reason for deferring this task"),
});

type DeferFormData = z.infer<typeof deferFormSchema>;

interface DeferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDefer: (reason: string) => void;
  task: TaskWithProject | null;
  isPending?: boolean;
}

export default function DeferModal({ 
  isOpen, 
  onClose, 
  onDefer, 
  task, 
  isPending = false 
}: DeferModalProps) {
  const form = useForm<DeferFormData>({
    resolver: zodResolver(deferFormSchema),
    defaultValues: {
      reason: "",
    },
  });

  const onSubmit = (data: DeferFormData) => {
    onDefer(data.reason);
    form.reset();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Move Task to Tomorrow</DialogTitle>
        </DialogHeader>

        {task && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-900">{task.title}</div>
            <div className="text-sm text-gray-500 mt-1">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: task.project.color }}
                ></div>
                {task.project.name}
              </div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reason for deferring <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please provide a reason for moving this task to tomorrow..."
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isPending ? "Moving..." : "Move to Tomorrow"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
