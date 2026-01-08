import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ListChecks } from "lucide-react";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { register, isRegistering, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "오류",
        description: "비밀번호가 일치하지 않습니다",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 4) {
      toast({
        title: "오류",
        description: "비밀번호는 4자 이상이어야 합니다",
        variant: "destructive",
      });
      return;
    }

    try {
      await register({ username, password });
      toast({
        title: "회원가입 완료",
        description: "환영합니다!",
      });
      setLocation("/");
    } catch (error: any) {
      const message = error?.message || "회원가입에 실패했습니다";
      toast({
        title: "회원가입 실패",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-primary">
              <ListChecks className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>시험관리 시스템에 가입하세요</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">사용자명</Label>
              <Input
                id="username"
                type="text"
                placeholder="사용자명을 입력하세요 (3자 이상)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                required
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요 (4자 이상)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={4}
                required
                data-testid="input-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                data-testid="input-confirm-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isRegistering}
              data-testid="button-register"
            >
              {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              회원가입
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                로그인
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
