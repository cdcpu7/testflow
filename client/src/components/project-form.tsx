import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, type InsertProject, type Project } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: InsertProject) => void;
  project?: Project;
  isPending?: boolean;
}

export function ProjectForm({ open, onClose, onSubmit, project, isPending }: ProjectFormProps) {
  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      productSpec: project?.productSpec || "",
      scheduleImage: project?.scheduleImage || "",
      productImage: project?.productImage || "",
      startDate: project?.startDate || "",
      endDate: project?.endDate || "",
      status: project?.status || "진행중",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: project?.name || "",
        description: project?.description || "",
        productSpec: project?.productSpec || "",
        scheduleImage: project?.scheduleImage || "",
        productImage: project?.productImage || "",
        startDate: project?.startDate || "",
        endDate: project?.endDate || "",
        status: project?.status || "진행중",
      });
    }
  }, [open, project, form]);

  const handleSubmit = (data: InsertProject) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "프로젝트 수정" : "새 프로젝트"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>프로젝트명 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="프로젝트명을 입력하세요"
                      {...field}
                      data-testid="input-project-name"
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
                      placeholder="프로젝트 설명을 입력하세요"
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="input-project-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시작일</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>종료일</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상태</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="상태 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="진행중">진행중</SelectItem>
                      <SelectItem value="완료">완료</SelectItem>
                      <SelectItem value="보류">보류</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productSpec"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제품 사양</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="제품 사양을 입력하세요"
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="input-product-spec"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-project">
                {isPending ? "저장 중..." : project ? "수정" : "생성"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
