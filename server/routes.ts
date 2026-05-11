import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertTestItemSchema, insertIssueItemSchema, insertUserSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import XLSX from "xlsx";
import ExcelJS from "exceljs";
import { format, addDays, startOfWeek, endOfWeek, parseISO, isWithinInterval, startOfDay, isBefore, isAfter, parse, isValid } from "date-fns";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: multerStorage });

function canAccessProject(project: any, userId?: string): boolean {
  return !!project && !!userId && project.userId === userId;
}

function isSafeUploadPath(fileUrl: string | null | undefined): boolean {
  return typeof fileUrl === "string" && /^\/uploads\/[A-Za-z0-9._-]+$/.test(fileUrl);
}

function normalizeImportedDate(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (value instanceof Date && isValid(value)) {
    return format(value, "yyyy-MM-dd");
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const date = new Date(parsed.y, parsed.m - 1, parsed.d);
      if (isValid(date)) return format(date, "yyyy-MM-dd");
    }
  }

  const raw = String(value).trim();
  if (!raw) return "";

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric > 20000 && numeric < 100000) {
      const parsed = XLSX.SSF.parse_date_code(numeric);
      if (parsed) {
        const date = new Date(parsed.y, parsed.m - 1, parsed.d);
        if (isValid(date)) return format(date, "yyyy-MM-dd");
      }
    }
  }

  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.length === 8) {
    const yyyy = Number(digitsOnly.slice(0, 4));
    const mm = Number(digitsOnly.slice(4, 6));
    const dd = Number(digitsOnly.slice(6, 8));
    const date = new Date(yyyy, mm - 1, dd);
    if (date.getFullYear() === yyyy && date.getMonth() === mm - 1 && date.getDate() === dd) {
      return format(date, "yyyy-MM-dd");
    }
  }

  const normalized = raw.replace(/\./g, "/").replace(/-/g, "/").replace(/\s+/g, " ");
  const parts = normalized.split(/[^0-9A-Za-z]+/).filter(Boolean);

  let formats: string[] = [];
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      formats = ["yyyy/MM/dd", "yyyy/M/d"];
    } else if (parts[2].length === 4) {
      formats = ["MM/dd/yyyy", "M/d/yyyy", "dd/MM/yyyy", "d/M/yyyy"];
    } else if (parts[2].length <= 2) {
      formats = ["MM/dd/yy", "M/d/yy", "dd/MM/yy", "d/M/yy"];
    } else if (parts[0].length <= 2) {
      formats = ["yy/MM/dd", "yy/M/d"];
    }
  }

  formats.push("MMM d, yyyy", "MMMM d, yyyy");

  for (const dateFormat of formats) {
    const parsed = parse(normalized, dateFormat, new Date());
    if (isValid(parsed)) {
      const yearToken = dateFormat.split("/").find((token) => token.includes("y")) ?? "";
      if (yearToken === "yy" && parsed.getFullYear() < 2000) {
        parsed.setFullYear(parsed.getFullYear() + 100);
      }
      return format(parsed, "yyyy-MM-dd");
    }
  }

  const isoParsed = parseISO(raw);
  if (isValid(isoParsed)) {
    return format(isoParsed, "yyyy-MM-dd");
  }

  return raw;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth API
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "사용자명과 비밀번호를 입력하세요" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "사용자명 또는 비밀번호가 틀립니다" });
      }

      // 기존 평문 비밀번호 데이터(레거시)와 bcrypt 해시 둘 다 허용
      let valid = false;
      try {
        valid = await bcrypt.compare(password, user.password);
      } catch {
        valid = password === user.password;
      }

      if (!valid) {
        return res.status(401).json({ error: "사용자명 또는 비밀번호가 틀립니다" });
      }
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "로그인에 실패했습니다" });
        }
        req.session.userId = user.id;
        res.json({ id: user.id, username: user.username });
      });
    } catch (error) {
      res.status(500).json({ error: "로그인에 실패했습니다" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "로그아웃에 실패했습니다" });
      }
      res.clearCookie("testflow.sid", { path: "/" });
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "사용자를 찾을 수 없습니다" });
    }
    res.json({ id: user.id, username: user.username });
  });

  app.use("/uploads", (req, res, next) => {
    const normalizedPath = path.normalize(req.path).replace(/^([.]{2}[\/\\])+/, "");
    const filePath = path.join(uploadDir, normalizedPath);
    if (filePath.startsWith(uploadDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.sendFile(filePath);
    } else {
      res.status(404).send("File not found");
    }
  });

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }
    next();
  };

  // Projects API
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUser(req.session.userId!);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const parsed = insertProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const project = await storage.createProject(parsed.data, req.session.userId!);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const current = await storage.getProject(req.params.id);
      if (!canAccessProject(current, req.session.userId)) {
        return res.status(current ? 403 : 404).json({ error: current ? "Forbidden" : "Project not found" });
      }
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const current = await storage.getProject(req.params.id);
      if (!canAccessProject(current, req.session.userId)) {
        return res.status(current ? 403 : 404).json({ error: current ? "Forbidden" : "Project not found" });
      }
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  app.post("/api/projects/:id/images", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const type = req.body.type as "product" | "schedule";
      const updates = type === "product"
        ? { productImage: imageUrl }
        : { scheduleImage: imageUrl };
      const updated = await storage.updateProject(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Test Items API
  app.get("/api/test-items", requireAuth, async (req, res) => {
    try {
      const items = await storage.getTestItemsByUser(req.session.userId!);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch test items" });
    }
  });

  app.get("/api/projects/:projectId/test-items", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(project ? 403 : 404).json({ error: project ? "Forbidden" : "Project not found" });
      }
      const items = await storage.getTestItemsByProject(req.params.projectId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch test items" });
    }
  });

  app.post("/api/projects/:projectId/test-items", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(project ? 403 : 404).json({ error: project ? "Forbidden" : "Project not found" });
      }
      const data = { ...req.body, projectId: req.params.projectId };
      const parsed = insertTestItemSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const item = await storage.createTestItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create test item" });
    }
  });

  app.patch("/api/test-items/:id", requireAuth, async (req, res) => {
    try {
      const current = await storage.getTestItem(req.params.id);
      const project = current ? await storage.getProject(current.projectId) : undefined;
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(current ? 403 : 404).json({ error: current ? "Forbidden" : "Test item not found" });
      }
      const item = await storage.updateTestItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Test item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update test item" });
    }
  });

  app.delete("/api/test-items/:id", requireAuth, async (req, res) => {
    try {
      const current = await storage.getTestItem(req.params.id);
      const project = current ? await storage.getProject(current.projectId) : undefined;
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(current ? 403 : 404).json({ error: current ? "Forbidden" : "Test item not found" });
      }
      const deleted = await storage.deleteTestItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Test item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete test item" });
    }
  });

  app.post("/api/test-items/:id/photos", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const item = await storage.getTestItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Test item not found" });
      }
      if (!canAccessProject(await storage.getProject(item.projectId), req.session.userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const photoUrl = `/uploads/${req.file.filename}`;
      const photos = [...(item.photos || []), photoUrl];
      const updated = await storage.updateTestItem(req.params.id, { photos });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.post("/api/test-items/:id/graphs", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const item = await storage.getTestItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Test item not found" });
      }
      if (!canAccessProject(await storage.getProject(item.projectId), req.session.userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const graphUrl = `/uploads/${req.file.filename}`;
      const graphs = [...(item.graphs || []), graphUrl];
      const updated = await storage.updateTestItem(req.params.id, { graphs });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload graph" });
    }
  });

  app.post("/api/test-items/:id/attachments", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const item = await storage.getTestItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Test item not found" });
      }
      if (!canAccessProject(await storage.getProject(item.projectId), req.session.userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const attachment = { url: fileUrl, filename: originalName, size: req.file.size };
      const attachments = [...(item.attachments || []), attachment];
      const updated = await storage.updateTestItem(req.params.id, { attachments });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload attachment" });
    }
  });

  // Issue Items API
  app.get("/api/projects/:projectId/issue-items", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(project ? 403 : 404).json({ error: project ? "Forbidden" : "Project not found" });
      }
      const items = await storage.getIssueItemsByProject(req.params.projectId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch issue items" });
    }
  });

  // 서버 반영 확인용 테스트 라우트
  app.get("/api/ping", (req, res) => {
    res.json({ message: "pong", version: "1.0.2" });
  });

  app.get("/api/projects/:projectId/issue-items-export", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(project ? 403 : 404).json({ error: project ? "Forbidden" : "Project not found" });
      }
      const issues = await storage.getIssueItemsByProject(req.params.projectId);
      const testItems = await storage.getTestItemsByProject(req.params.projectId);
      const testItemMap = new Map(testItems.map(ti => [ti.id, ti.name]));

      const headers = ["문제항목명", "심각도", "발생일", "완료예정일", "실제완료일", "연관 시험 항목", "문제 내용", "문제 원인", "문제 대책", "대책 검증 결과", "진행 상태", "메모"];
      const rows = issues.map((item) => [
        item.name || "",
        item.severity || "Medium",
        item.occurredDate || "",
        item.plannedEndDate || "",
        item.actualEndDate || "",
        testItemMap.get(item.relatedTestItemId || "") || "",
        item.issueContent || "",
        item.issueCause || "",
        item.issueCountermeasure || "",
        item.verificationResult || "",
        item.progressStatus || "대기중",
        item.notes || "",
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const colWidths = [25, 10, 14, 14, 14, 25, 35, 30, 30, 30, 12, 30];
      ws["!cols"] = colWidths.map((w) => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "문제항목");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", "attachment; filename=issue_items.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (error) {
      res.status(500).json({ error: "Failed to export issue items" });
    }
  });

  app.post("/api/projects/:projectId/issue-items", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(project ? 403 : 404).json({ error: project ? "Forbidden" : "Project not found" });
      }
      const data = { ...req.body, projectId: req.params.projectId };
      const parsed = insertIssueItemSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const item = await storage.createIssueItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create issue item" });
    }
  });

  app.patch("/api/issue-items/:id", requireAuth, async (req, res) => {
    try {
      const current = await storage.getIssueItem(req.params.id);
      const project = current ? await storage.getProject(current.projectId) : undefined;
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(current ? 403 : 404).json({ error: current ? "Forbidden" : "Issue item not found" });
      }
      const item = await storage.updateIssueItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Issue item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update issue item" });
    }
  });

  app.delete("/api/issue-items/:id", requireAuth, async (req, res) => {
    try {
      const current = await storage.getIssueItem(req.params.id);
      const project = current ? await storage.getProject(current.projectId) : undefined;
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(current ? 403 : 404).json({ error: current ? "Forbidden" : "Issue item not found" });
      }
      const deleted = await storage.deleteIssueItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Issue item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete issue item" });
    }
  });

  app.post("/api/issue-items/:id/photos", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const item = await storage.getIssueItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Issue item not found" });
      }
      if (!canAccessProject(await storage.getProject(item.projectId), req.session.userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const photoUrl = `/uploads/${req.file.filename}`;
      const photos = [...(item.photos || []), photoUrl];
      const updated = await storage.updateIssueItem(req.params.id, { photos });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.post("/api/issue-items/:id/graphs", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const item = await storage.getIssueItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Issue item not found" });
      }
      if (!canAccessProject(await storage.getProject(item.projectId), req.session.userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const graphUrl = `/uploads/${req.file.filename}`;
      const graphs = [...(item.graphs || []), graphUrl];
      const updated = await storage.updateIssueItem(req.params.id, { graphs });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload graph" });
    }
  });

  app.post("/api/issue-items/:id/attachments", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const item = await storage.getIssueItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Issue item not found" });
      }
      if (!canAccessProject(await storage.getProject(item.projectId), req.session.userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const attachment = { url: fileUrl, filename: originalName, size: req.file.size };
      const attachments = [...(item.attachments || []), attachment];
      const updated = await storage.updateIssueItem(req.params.id, { attachments });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload attachment" });
    }
  });

  app.get("/api/projects/:projectId/test-plan-export", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(project ? 403 : 404).json({ error: project ? "Forbidden" : "Project not found" });
      }
      const items = await storage.getTestItemsByProject(req.params.projectId);
      const today = startOfDay(new Date());

      const dates = items
        .flatMap(item => [
          item.plannedStartDate ? parseISO(item.plannedStartDate) : null,
          item.plannedEndDate ? parseISO(item.plannedEndDate) : null
        ])
        .filter((d): d is Date => d !== null);

      let weekStart = startOfWeek(today, { weekStartsOn: 0 });
      let chartEnd = addDays(weekStart, 13);

      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        weekStart = startOfWeek(isBefore(minDate, today) ? minDate : today, { weekStartsOn: 0 });
        chartEnd = addDays(startOfWeek(isAfter(maxDate, addDays(weekStart, 13)) ? maxDate : addDays(weekStart, 13), { weekStartsOn: 0 }), 6);
      }
      const daysCount = Math.floor((chartEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const days = Array.from({ length: daysCount }).map((_, i) => addDays(weekStart, i));

      const sortedItems = items
        .filter(item => item.plannedStartDate)
        .sort((a, b) => {
          const startA = parseISO(a.plannedStartDate!).getTime();
          const startB = parseISO(b.plannedStartDate!).getTime();
          return startA - startB;
        });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("시험 계획");

      // Set columns
      const baseCols = [
        { header: "No", key: "no", width: 5 },
        { header: "시험항목명", key: "name", width: 30 },
        { header: "상태", key: "status", width: 10 },
        { header: "시작일", key: "startDate", width: 12 },
        { header: "종료일", key: "endDate", width: 12 },
      ];

      worksheet.columns = [
        ...baseCols,
        ...days.map((day, i) => ({
          header: format(day, "M/d"),
          key: `day_${i}`,
          width: 4,
        }))
      ];

      // Styling Header
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add Data
      sortedItems.forEach((item, idx) => {
        let status = item.progressStatus || "대기";
        if (item.progressStatus === "완료") {
          status = "완료";
        } else if (item.plannedEndDate && isAfter(today, parseISO(item.plannedEndDate))) {
          status = "일정초과";
        } else if (item.plannedStartDate && (isWithinInterval(today, { start: parseISO(item.plannedStartDate), end: item.plannedEndDate ? parseISO(item.plannedEndDate) : parseISO(item.plannedStartDate) }) || isAfter(today, parseISO(item.plannedStartDate))) && item.progressStatus !== "진행중") {
          status = "지연";
        }

        const rowData: any = {
          no: idx + 1,
          name: item.name,
          status: status,
          startDate: item.plannedStartDate || "",
          endDate: item.plannedEndDate || "",
        };

        const row = worksheet.addRow(rowData);

        // Color Gantt Cells
        if (item.plannedStartDate) {
          const itemStart = parseISO(item.plannedStartDate);
          const itemEnd = item.plannedEndDate ? parseISO(item.plannedEndDate) : itemStart;

          days.forEach((day, dayIdx) => {
            const currentDayStart = startOfDay(day);
            if (currentDayStart >= startOfDay(itemStart) && currentDayStart <= startOfDay(itemEnd)) {
              const cell = row.getCell(baseCols.length + dayIdx + 1);

              let color = 'FF3B82F6'; // Default Blue (In Progress)
              if (status === "완료") color = 'FF10B981'; // Green
              if (status === "일정초과") color = 'FFEF4444'; // Red
              if (status === "지연") color = 'FFF59E0B'; // Amber
              if (status === "대기중" || status === "대기") color = 'FFE0E0E0'; // Light Gray for pending in gantt (optional, common practice is to keep it empty or gray)

              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: color }
              };
            }
          });
        }

        // Row alignment
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };
      });

      // Borders
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      res.setHeader("Content-Disposition", "attachment; filename=test_plan.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export test plan" });
    }
  });

  app.get("/api/projects/:projectId/test-items/export", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(project ? 403 : 404).json({ error: project ? "Forbidden" : "Project not found" });
      }
      const items = await storage.getTestItemsByProject(req.params.projectId);
      const headers = ["시험항목명", "시작일", "완료예정일", "실제완료일", "시험 조건", "판정 기준", "시험 데이터", "시험 결과", "진행 상태", "보고서 상태", "메모"];
      const rows = items.map((item) => [
        item.name || "",
        item.plannedStartDate || "",
        item.plannedEndDate || "",
        item.actualEndDate || "",
        item.testCondition || "",
        item.judgmentCriteria || "",
        item.testData || "",
        item.testResult || "",
        item.progressStatus || "",
        item.reportStatus || "",
        item.notes || "",
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const colWidths = [20, 14, 14, 14, 30, 30, 30, 12, 12, 12, 30];
      ws["!cols"] = colWidths.map((w) => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "시험항목");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", "attachment; filename=test_items.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (error) {
      res.status(500).json({ error: "Failed to export test items" });
    }
  });

  app.post("/api/projects/:projectId/test-items/import", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(project ? 403 : 404).json({ error: project ? "Forbidden" : "Project not found" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      let data: any[][];

      if (ext === ".csv") {
        const csvContent = fs.readFileSync(req.file.path, "utf-8");
        const wb = XLSX.read(csvContent, { type: "string", raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
      } else {
        const wb = XLSX.readFile(req.file.path, { raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
      }

      if (data.length < 2) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "엑셀 파일에 데이터가 없습니다. (헤더 + 최소 1행 필요)" });
      }

      const validResults = ["OK", "NG", "TBD", ""];
      const validProgress = ["대기중", "진행중", "완료"];
      const validReport = ["대기중", "작성중", "완료"];
      const errors: string[] = [];
      const items: any[] = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0 || row.every((c: any) => c === undefined || c === null || c === "")) continue;

        const rowNum = i + 1;
        const testResult = String(row[7] ?? "").trim();
        const progressStatus = String(row[8] ?? "").trim();
        const reportStatus = String(row[9] ?? "").trim();

        if (testResult && !validResults.includes(testResult)) {
          errors.push(`${rowNum}행: 시험 결과 "${testResult}"는 허용되지 않는 값입니다. (OK/NG/TBD 중 선택)`);
        }
        if (progressStatus && !validProgress.includes(progressStatus)) {
          errors.push(`${rowNum}행: 진행 상태 "${progressStatus}"는 허용되지 않는 값입니다. (대기중/진행중/완료 중 선택)`);
        }
        if (reportStatus && !validReport.includes(reportStatus)) {
          errors.push(`${rowNum}행: 보고서 상태 "${reportStatus}"는 허용되지 않는 값입니다. (대기중/작성중/완료 중 선택)`);
        }

        items.push({
          projectId: req.params.projectId,
          name: String(row[0] ?? "").trim() || `시험항목 ${i}`,
          plannedStartDate: normalizeImportedDate(row[1]),
          plannedEndDate: normalizeImportedDate(row[2]),
          actualEndDate: normalizeImportedDate(row[3]),
          testCondition: String(row[4] ?? "").trim(),
          judgmentCriteria: String(row[5] ?? "").trim(),
          testData: String(row[6] ?? "").trim(),
          testResult: testResult || "",
          progressStatus: progressStatus || "대기중",
          reportStatus: reportStatus || "대기중",
          notes: String(row[10] ?? "").trim(),
          photos: [],
          graphs: [],
          attachments: [],
        });
      }

      fs.unlinkSync(req.file.path);

      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join("\n") });
      }

      if (items.length === 0) {
        return res.status(400).json({ error: "유효한 데이터 행이 없습니다." });
      }

      const created: any[] = [];
      for (let idx = 0; idx < items.length; idx++) {
        const result = await storage.createTestItem(items[idx]);
        created.push(result);
      }

      res.status(201).json({ count: created.length, items: created });
    } catch (error: any) {
      console.error("Excel import error:", error?.message, error?.stack);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "엑셀 파일 처리 중 오류가 발생했습니다." });
    }
  });


  app.post("/api/projects/:projectId/issue-items/import", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const project = await storage.getProject(req.params.projectId);
      if (!canAccessProject(project, req.session.userId)) {
        return res.status(project ? 403 : 404).json({ error: project ? "Forbidden" : "Project not found" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      let data: any[][];

      if (ext === ".csv") {
        const csvContent = fs.readFileSync(req.file.path, "utf-8");
        const wb = XLSX.read(csvContent, { type: "string", raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
      } else {
        const wb = XLSX.readFile(req.file.path, { raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
      }

      if (data.length < 2) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "엑셀 파일에 데이터가 없습니다. (헤더 + 최소 1행 필요)" });
      }

      const validSeverity = ["Low", "Medium", "High", "Critical"];
      const validProgress = ["대기중", "진행중", "완료"];
      const errors: string[] = [];
      const items: any[] = [];

      const testItems = await storage.getTestItemsByProject(req.params.projectId);
      const testItemNameToId = new Map(testItems.map(ti => [ti.name, ti.id]));

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0 || row.every((c: any) => c === undefined || c === null || c === "")) continue;

        const rowNum = i + 1;
        const severity = String(row[1] ?? "").trim() || "Medium";
        const progressStatus = String(row[10] ?? "").trim() || "대기중";

        if (severity && !validSeverity.includes(severity)) {
          errors.push(`${rowNum}행: 심각도 "${severity}"는 허용되지 않는 값입니다. (Low/Medium/High/Critical 중 선택)`);
        }
        if (progressStatus && !validProgress.includes(progressStatus)) {
          errors.push(`${rowNum}행: 진행 상태 "${progressStatus}"는 허용되지 않는 값입니다. (대기중/진행중/완료 중 선택)`);
        }

        const relatedTestItemName = String(row[5] ?? "").trim();
        const relatedTestItemId = relatedTestItemName ? testItemNameToId.get(relatedTestItemName) : null;

        items.push({
          projectId: req.params.projectId,
          name: String(row[0] ?? "").trim() || `문제항목 ${i}`,
          severity: severity,
          occurredDate: normalizeImportedDate(row[2]),
          plannedEndDate: normalizeImportedDate(row[3]),
          actualEndDate: normalizeImportedDate(row[4]),
          relatedTestItemId: relatedTestItemId,
          issueContent: String(row[6] ?? "").trim(),
          issueCause: String(row[7] ?? "").trim(),
          issueCountermeasure: String(row[8] ?? "").trim(),
          verificationResult: String(row[9] ?? "").trim(),
          progressStatus: progressStatus,
          notes: String(row[11] ?? "").trim(),
          photos: [],
          graphs: [],
          attachments: [],
        });
      }

      fs.unlinkSync(req.file.path);

      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join("\n") });
      }

      if (items.length === 0) {
        return res.status(400).json({ error: "유효한 데이터 행이 없습니다." });
      }

      const created: any[] = [];
      for (let idx = 0; idx < items.length; idx++) {
        const result = await storage.createIssueItem(items[idx]);
        created.push(result);
      }

      res.status(201).json({ count: created.length, items: created });
    } catch (error: any) {
      console.error("Issue Excel import error:", error?.message, error?.stack);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "엑셀 파일 처리 중 오류가 발생했습니다." });
    }
  });

  return httpServer;
}
