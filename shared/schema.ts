import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}).extend({
  username: z.string().min(3, "사용자명은 3자 이상이어야 합니다"),
  password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Project schema
export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "프로젝트명을 입력하세요"),
  description: z.string().optional(),
  productSpec: z.string().optional(),
  scheduleImage: z.string().optional(),
  scheduleDescription: z.string().optional(),
  productImage: z.string().optional(),
  productSpecDescription: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["진행중", "완료", "프로젝트 중단"]).default("진행중"),
});

export const insertProjectSchema = projectSchema.omit({ id: true });

export type Project = z.infer<typeof projectSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;

// Test Item schema
export const testItemSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string().min(1, "시험항목명을 입력하세요"),
  lastModifiedDate: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  testCondition: z.string().optional(),
  judgmentCriteria: z.string().optional(),
  testData: z.string().optional(),
  testResult: z.enum(["", "OK", "NG", "TBD"]).default(""),
  progressStatus: z.enum(["대기중", "진행중", "완료"]).default("대기중"),
  reportStatus: z.enum(["대기중", "작성중", "완료"]).default("대기중"),
  notes: z.string().optional(),
  photos: z.array(z.string()).default([]),
  graphs: z.array(z.string()).default([]),
});

export const insertTestItemSchema = testItemSchema.omit({ id: true });

export type TestItem = z.infer<typeof testItemSchema>;
export type InsertTestItem = z.infer<typeof insertTestItemSchema>;

// Issue Item schema (문제항목)
export const issueItemSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string().min(1, "문제항목명을 입력하세요"),
  lastModifiedDate: z.string().optional(),
  severity: z.enum(["Low", "Medium", "High"]).default("Medium"),
  occurredDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  relatedTestItemId: z.string().optional(),
  issueContent: z.string().optional(),
  issueCause: z.string().optional(),
  issueCountermeasure: z.string().optional(),
  verificationResult: z.string().optional(),
  progressStatus: z.enum(["대기중", "진행중", "완료"]).default("대기중"),
  notes: z.string().optional(),
  photos: z.array(z.string()).default([]),
  graphs: z.array(z.string()).default([]),
});

export const insertIssueItemSchema = issueItemSchema.omit({ id: true });

export type IssueItem = z.infer<typeof issueItemSchema>;
export type InsertIssueItem = z.infer<typeof insertIssueItemSchema>;
