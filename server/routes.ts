import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertTestItemSchema, insertIssueItemSchema, insertUserSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import XLSX from "xlsx";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth API
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(400).json({ error: "이미 사용 중인 사용자명입니다" });
      }
      const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
      const user = await storage.createUser({
        username: parsed.data.username,
        password: hashedPassword,
      });
      req.session.userId = user.id;
      res.status(201).json({ id: user.id, username: user.username });
    } catch (error) {
      res.status(500).json({ error: "회원가입에 실패했습니다" });
    }
  });

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
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "사용자명 또는 비밀번호가 틀립니다" });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      res.status(500).json({ error: "로그인에 실패했습니다" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "로그아웃에 실패했습니다" });
      }
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
    const filePath = path.join(uploadDir, req.path);
    if (fs.existsSync(filePath)) {
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
      const items = await storage.getAllTestItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch test items" });
    }
  });

  app.get("/api/projects/:projectId/test-items", requireAuth, async (req, res) => {
    try {
      const items = await storage.getTestItemsByProject(req.params.projectId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch test items" });
    }
  });

  app.post("/api/projects/:projectId/test-items", requireAuth, async (req, res) => {
    try {
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
      const items = await storage.getIssueItemsByProject(req.params.projectId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch issue items" });
    }
  });

  app.post("/api/projects/:projectId/issue-items", requireAuth, async (req, res) => {
    try {
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

  app.get("/api/projects/:projectId/test-items/export", requireAuth, async (req, res) => {
    try {
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
          plannedStartDate: String(row[1] ?? "").trim(),
          plannedEndDate: String(row[2] ?? "").trim(),
          actualEndDate: String(row[3] ?? "").trim(),
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

  return httpServer;
}
