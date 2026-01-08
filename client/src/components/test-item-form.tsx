import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const testItemFormSchema = z.object({
  name: z.string().min(1, "시험항목명을 입력하세요"),
  description: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
});

type TestItemFormData = z.infer<typeof testItemFormSchema>;

interface TestItemFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TestItemFormData) => void;
  isPending?: boolean;
}

export function TestItemForm({ open, onClose, onSubmit, isPending }: TestItemFormProps) {
  const form = useForm<TestItemFormData>({
    resolver: zodResolver(testItemFormSchema),
    defaultValues: {
      name: "",
      description: "",
      plannedStartDate: "",
      plannedEndDate: "",
    },
  });

  const handleSubmit = (data: TestItemFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>새 시험항목</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>시험항목명 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="시험항목명을 입력하세요"
                      {...field}
                      data-testid="input-test-item-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="시험항목 설명을 입력하세요"
                      className="resize-none"
                      rows={2}
                      {...field}
                      data-testid="input-test-item-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="plannedStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시작일</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-item-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plannedEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>완료예정일</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-item-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-test-item">
                {isPending ? "추가 중..." : "추가"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
