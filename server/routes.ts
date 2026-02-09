import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertTestItemSchema, insertIssueItemSchema, insertUserSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";

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
      const attachment = { url: fileUrl, filename: req.file.originalname, size: req.file.size };
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
      const attachment = { url: fileUrl, filename: req.file.originalname, size: req.file.size };
      const attachments = [...(item.attachments || []), attachment];
      const updated = await storage.updateIssueItem(req.params.id, { attachments });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload attachment" });
    }
  });

  return httpServer;
}
