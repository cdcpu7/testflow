import {
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type TestItem,
  type InsertTestItem,
  type IssueItem,
  type InsertIssueItem,
  users,
  projects,
  testItems,
  issueItems,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

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
  getTestItemsByUser(userId: string): Promise<TestItem[]>;
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

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const [user] = await db.insert(users).values({ ...insertUser, id }).returning();
    return user;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId));
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  private todayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  private async touchProject(projectId: string): Promise<void> {
    await db
      .update(projects)
      .set({ lastUpdatedAt: this.todayString() })
      .where(eq(projects.id, projectId));
  }

  async createProject(projectData: InsertProject, userId: string): Promise<Project> {
    const id = randomUUID();
    const [project] = await db
      .insert(projects)
      .values({
        id,
        userId,
        ...projectData,
        lastUpdatedAt: this.todayString(),
      } as any)
      .returning();
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set({ ...updates, lastUpdatedAt: this.todayString() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    // Note: Foreign key constraints with onDelete: "cascade" should handle testItems and issueItems
    const [deleted] = await db.delete(projects).where(eq(projects.id, id)).returning();
    return !!deleted;
  }

  async getAllTestItems(): Promise<TestItem[]> {
    return await db.select().from(testItems);
  }

  async getTestItemsByUser(userId: string): Promise<TestItem[]> {
    return await db
      .select({
        id: testItems.id,
        projectId: testItems.projectId,
        name: testItems.name,
        plannedStartDate: testItems.plannedStartDate,
        plannedEndDate: testItems.plannedEndDate,
        actualEndDate: testItems.actualEndDate,
        testCondition: testItems.testCondition,
        judgmentCriteria: testItems.judgmentCriteria,
        testData: testItems.testData,
        testResult: testItems.testResult,
        progressStatus: testItems.progressStatus,
        reportStatus: testItems.reportStatus,
        notes: testItems.notes,
        photos: testItems.photos,
        graphs: testItems.graphs,
        attachments: testItems.attachments,
        lastModifiedDate: testItems.lastModifiedDate,
      })
      .from(testItems)
      .innerJoin(projects, eq(testItems.projectId, projects.id))
      .where(eq(projects.userId, userId));
  }

  async getTestItemsByProject(projectId: string): Promise<TestItem[]> {
    return await db.select().from(testItems).where(eq(testItems.projectId, projectId));
  }

  async getTestItem(id: string): Promise<TestItem | undefined> {
    const [item] = await db.select().from(testItems).where(eq(testItems.id, id));
    return item;
  }

  async createTestItem(itemData: InsertTestItem): Promise<TestItem> {
    const id = randomUUID();
    const [item] = await db
      .insert(testItems)
      .values({
        id,
        testResult: itemData.testResult ?? "",
        progressStatus: itemData.progressStatus ?? "대기중",
        reportStatus: itemData.reportStatus ?? "대기중",
        photos: itemData.photos ?? [],
        graphs: itemData.graphs ?? [],
        attachments: itemData.attachments ?? [],
        ...itemData,
        lastModifiedDate: this.todayString(),
      } as any)
      .returning();
    await this.touchProject(itemData.projectId);
    return item;
  }

  async updateTestItem(id: string, updates: Partial<TestItem>): Promise<TestItem | undefined> {
    const [updated] = await db
      .update(testItems)
      .set({ ...updates, lastModifiedDate: this.todayString() })
      .where(eq(testItems.id, id))
      .returning();
    if (updated) await this.touchProject(updated.projectId);
    return updated;
  }

  async deleteTestItem(id: string): Promise<boolean> {
    const [item] = await db.select().from(testItems).where(eq(testItems.id, id));
    const [deleted] = await db.delete(testItems).where(eq(testItems.id, id)).returning();
    if (item) await this.touchProject(item.projectId);
    return !!deleted;
  }

  async getAllIssueItems(): Promise<IssueItem[]> {
    return await db.select().from(issueItems);
  }

  async getIssueItemsByProject(projectId: string): Promise<IssueItem[]> {
    return await db.select().from(issueItems).where(eq(issueItems.projectId, projectId));
  }

  async getIssueItem(id: string): Promise<IssueItem | undefined> {
    const [item] = await db.select().from(issueItems).where(eq(issueItems.id, id));
    return item;
  }

  async createIssueItem(itemData: InsertIssueItem): Promise<IssueItem> {
    const id = randomUUID();
    const [item] = await db
      .insert(issueItems)
      .values({
        id,
        severity: itemData.severity ?? "Medium",
        progressStatus: itemData.progressStatus ?? "대기중",
        photos: itemData.photos ?? [],
        graphs: itemData.graphs ?? [],
        attachments: itemData.attachments ?? [],
        ...itemData,
        lastModifiedDate: this.todayString(),
      } as any)
      .returning();
    await this.touchProject(itemData.projectId);
    return item;
  }

  async updateIssueItem(id: string, updates: Partial<IssueItem>): Promise<IssueItem | undefined> {
    const [updated] = await db
      .update(issueItems)
      .set({ ...updates, lastModifiedDate: this.todayString() })
      .where(eq(issueItems.id, id))
      .returning();
    if (updated) await this.touchProject(updated.projectId);
    return updated;
  }

  async deleteIssueItem(id: string): Promise<boolean> {
    const [item] = await db.select().from(issueItems).where(eq(issueItems.id, id));
    const [deleted] = await db.delete(issueItems).where(eq(issueItems.id, id)).returning();
    if (item) await this.touchProject(item.projectId);
    return !!deleted;
  }
}

export const storage = new DatabaseStorage();

