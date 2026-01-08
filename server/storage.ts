import {
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type TestItem,
  type InsertTestItem,
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Projects
  getAllProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Test Items
  getAllTestItems(): Promise<TestItem[]>;
  getTestItemsByProject(projectId: string): Promise<TestItem[]>;
  getTestItem(id: string): Promise<TestItem | undefined>;
  createTestItem(item: InsertTestItem): Promise<TestItem>;
  updateTestItem(id: string, updates: Partial<TestItem>): Promise<TestItem | undefined>;
  deleteTestItem(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private testItems: Map<string, TestItem>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.testItems = new Map();
    this.initDefaultUser();
  }

  private async initDefaultUser() {
    const hashedPassword = await bcrypt.hash("1234", 10);
    const defaultUser: User = {
      id: randomUUID(),
      username: "노세영",
      password: hashedPassword,
      createdAt: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);
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
    return user;
  }

  // Projects
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = { ...projectData, id };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    const updated = { ...project, ...updates };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    // Delete associated test items
    const items = Array.from(this.testItems.values()).filter(
      (item) => item.projectId === id
    );
    for (const item of items) {
      this.testItems.delete(item.id);
    }
    return this.projects.delete(id);
  }

  // Test Items
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
      sampleReceived: itemData.sampleReceived ?? false,
      testInProgress: itemData.testInProgress ?? false,
      testCompleted: itemData.testCompleted ?? false,
      reportCompleted: itemData.reportCompleted ?? false,
      photos: itemData.photos ?? [],
      dataFiles: itemData.dataFiles ?? [],
    };
    this.testItems.set(id, item);
    return item;
  }

  async updateTestItem(id: string, updates: Partial<TestItem>): Promise<TestItem | undefined> {
    const item = this.testItems.get(id);
    if (!item) return undefined;
    const updated = { ...item, ...updates };
    this.testItems.set(id, updated);
    return updated;
  }

  async deleteTestItem(id: string): Promise<boolean> {
    return this.testItems.delete(id);
  }
}

export const storage = new MemStorage();
