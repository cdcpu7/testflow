import {
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type TestItem,
  type InsertTestItem,
  type IssueItem,
  type InsertIssueItem,
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Generic JSON file operations
function readJsonFile<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getProjectsByUser(userId: string): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject, userId: string): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  getAllTestItems(): Promise<TestItem[]>;
  getTestItemsByProject(projectId: string): Promise<TestItem[]>;
  getTestItem(id: string): Promise<TestItem | undefined>;
  createTestItem(item: InsertTestItem): Promise<TestItem>;
  updateTestItem(id: string, updates: Partial<TestItem>): Promise<TestItem | undefined>;
  deleteTestItem(id: string): Promise<boolean>;

  getAllIssueItems(): Promise<IssueItem[]>;
  getIssueItemsByProject(projectId: string): Promise<IssueItem[]>;
  getIssueItem(id: string): Promise<IssueItem | undefined>;
  createIssueItem(item: InsertIssueItem): Promise<IssueItem>;
  updateIssueItem(id: string, updates: Partial<IssueItem>): Promise<IssueItem | undefined>;
  deleteIssueItem(id: string): Promise<boolean>;
}

interface StorageData {
  users: Record<string, User>;
  projects: Record<string, Project>;
  testItems: Record<string, TestItem>;
  issueItems: Record<string, IssueItem>;
}

export class JsonStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private testItems: Map<string, TestItem>;
  private issueItems: Map<string, IssueItem>;
  private initialized: boolean = false;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.testItems = new Map();
    this.issueItems = new Map();
    this.loadData();
  }

  private loadData(): void {
    const data = readJsonFile<StorageData>("storage.json", {
      users: {},
      projects: {},
      testItems: {},
      issueItems: {},
    });

    this.users = new Map(Object.entries(data.users));
    this.projects = new Map(Object.entries(data.projects));
    this.testItems = new Map(Object.entries(data.testItems));
    this.issueItems = new Map(Object.entries(data.issueItems));

    // Create default user if no users exist
    if (this.users.size === 0) {
      this.initDefaultUser();
    }
    this.initialized = true;
  }

  private saveData(): void {
    const data: StorageData = {
      users: Object.fromEntries(this.users),
      projects: Object.fromEntries(this.projects),
      testItems: Object.fromEntries(this.testItems),
      issueItems: Object.fromEntries(this.issueItems),
    };
    writeJsonFile("storage.json", data);
  }

  private async initDefaultUser(): Promise<void> {
    const hashedPassword = await bcrypt.hash("1234", 10);
    const defaultUser: User = {
      id: randomUUID(),
      username: "노세영",
      password: hashedPassword,
      createdAt: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);
    this.saveData();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    this.saveData();
    return user;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter((p) => p.userId === userId);
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  private todayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  private async touchProject(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (project) {
      this.projects.set(projectId, { ...project, lastUpdatedAt: this.todayString() });
      this.saveData();
    }
  }

  async createProject(projectData: InsertProject, userId: string): Promise<Project> {
    const id = randomUUID();
    const project: Project = { ...projectData, id, userId, lastUpdatedAt: this.todayString() };
    this.projects.set(id, project);
    this.saveData();
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    const updated = { ...project, ...updates, lastUpdatedAt: this.todayString() };
    this.projects.set(id, updated);
    this.saveData();
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    const items = Array.from(this.testItems.values()).filter(
      (item) => item.projectId === id
    );
    for (const item of items) {
      this.testItems.delete(item.id);
    }
    const issues = Array.from(this.issueItems.values()).filter(
      (item) => item.projectId === id
    );
    for (const issue of issues) {
      this.issueItems.delete(issue.id);
    }
    const deleted = this.projects.delete(id);
    this.saveData();
    return deleted;
  }

  async getAllTestItems(): Promise<TestItem[]> {
    return Array.from(this.testItems.values());
  }

  async getTestItemsByProject(projectId: string): Promise<TestItem[]> {
    return Array.from(this.testItems.values()).filter(
      (item) => item.projectId === projectId
    );
  }

  async getTestItem(id: string): Promise<TestItem | undefined> {
    return this.testItems.get(id);
  }

  async createTestItem(itemData: InsertTestItem): Promise<TestItem> {
    const id = randomUUID();
    const item: TestItem = {
      ...itemData,
      id,
      testResult: itemData.testResult ?? "",
      progressStatus: itemData.progressStatus ?? "대기중",
      reportStatus: itemData.reportStatus ?? "대기중",
      photos: itemData.photos ?? [],
      graphs: itemData.graphs ?? [],
    };
    this.testItems.set(id, item);
    this.saveData();
    await this.touchProject(itemData.projectId);
    return item;
  }

  async updateTestItem(id: string, updates: Partial<TestItem>): Promise<TestItem | undefined> {
    const item = this.testItems.get(id);
    if (!item) return undefined;
    const updated = { ...item, ...updates };
    this.testItems.set(id, updated);
    this.saveData();
    await this.touchProject(item.projectId);
    return updated;
  }

  async deleteTestItem(id: string): Promise<boolean> {
    const item = this.testItems.get(id);
    const deleted = this.testItems.delete(id);
    this.saveData();
    if (item) await this.touchProject(item.projectId);
    return deleted;
  }

  async getAllIssueItems(): Promise<IssueItem[]> {
    return Array.from(this.issueItems.values());
  }

  async getIssueItemsByProject(projectId: string): Promise<IssueItem[]> {
    return Array.from(this.issueItems.values()).filter(
      (item) => item.projectId === projectId
    );
  }

  async getIssueItem(id: string): Promise<IssueItem | undefined> {
    return this.issueItems.get(id);
  }

  async createIssueItem(itemData: InsertIssueItem): Promise<IssueItem> {
    const id = randomUUID();
    const item: IssueItem = {
      ...itemData,
      id,
      severity: itemData.severity ?? "Medium",
      progressStatus: itemData.progressStatus ?? "대기중",
      photos: itemData.photos ?? [],
      graphs: itemData.graphs ?? [],
    };
    this.issueItems.set(id, item);
    this.saveData();
    await this.touchProject(itemData.projectId);
    return item;
  }

  async updateIssueItem(id: string, updates: Partial<IssueItem>): Promise<IssueItem | undefined> {
    const item = this.issueItems.get(id);
    if (!item) return undefined;
    const updated = { ...item, ...updates };
    this.issueItems.set(id, updated);
    this.saveData();
    await this.touchProject(item.projectId);
    return updated;
  }

  async deleteIssueItem(id: string): Promise<boolean> {
    const item = this.issueItems.get(id);
    const deleted = this.issueItems.delete(id);
    this.saveData();
    if (item) await this.touchProject(item.projectId);
    return deleted;
  }
}

export const storage = new JsonStorage();
