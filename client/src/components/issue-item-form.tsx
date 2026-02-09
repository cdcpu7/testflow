import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from "@/components/ui/button";

const issueItemFormSchema = z.object({
  name: z.string().min(1, "문제항목명을 입력하세요"),
});

type IssueItemFormData = z.infer<typeof issueItemFormSchema>;

interface IssueItemFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: IssueItemFormData) => void;
  isPending?: boolean;
}

export function IssueItemForm({ open, onClose, onSubmit, isPending }: IssueItemFormProps) {
  const form = useForm<IssueItemFormData>({
    resolver: zodResolver(issueItemFormSchema),
    defaultValues: { name: "" },
  });

  const handleSubmit = (data: IssueItemFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>새 문제항목</DialogTitle>
          <DialogDescription>문제항목명을 입력하세요. 세부 내용은 추가 후 편집할 수 있습니다.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>문제항목명 *</FormLabel>
                  <FormControl>
                    <Input placeholder="문제항목명을 입력하세요" {...field} data-testid="input-issue-item-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>취소</Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-issue-item">
                {isPending ? "추가 중..." : "추가"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
