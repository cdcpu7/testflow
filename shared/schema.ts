import { pgTable, text, varchar, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Attachment schema (Shared Zod)
export const attachmentSchema = z.object({
  url: z.string(),
  filename: z.string(),
  size: z.number().optional(),
});

export type Attachment = z.infer<typeof attachmentSchema>;

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  productSpec: text("product_spec"),
  scheduleImage: text("schedule_image"),
  scheduleDescription: text("schedule_description"),
  productImage: text("product_image"),
  productSpecDescription: text("product_spec_description"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: text("status").notNull().default("진행중"),
  lastUpdatedAt: text("last_updated_at"),
});

// Test Items table
export const testItems = pgTable("test_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  lastModifiedDate: text("last_modified_date"),
  plannedStartDate: text("planned_start_date"),
  plannedEndDate: text("planned_end_date"),
  actualEndDate: text("actual_end_date"),
  testCondition: text("test_condition"),
  judgmentCriteria: text("judgment_criteria"),
  testData: text("test_data"),
  testResult: text("test_result").notNull().default(""),
  progressStatus: text("progress_status").notNull().default("대기중"),
  reportStatus: text("report_status").notNull().default("대기중"),
  notes: text("notes"),
  photos: jsonb("photos").$type<string[]>().notNull().default([]),
  graphs: jsonb("graphs").$type<string[]>().notNull().default([]),
  attachments: jsonb("attachments").$type<Attachment[]>().notNull().default([]),
});

// Issue Items table
export const issueItems = pgTable("issue_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  lastModifiedDate: text("last_modified_date"),
  severity: text("severity").notNull().default("Medium"),
  occurredDate: text("occurred_date"),
  plannedEndDate: text("planned_end_date"),
  actualEndDate: text("actual_end_date"),
  relatedTestItemId: text("related_test_item_id"),
  issueContent: text("issue_content"),
  issueCause: text("issue_cause"),
  issueCountermeasure: text("issue_countermeasure"),
  verificationResult: text("verification_result"),
  progressStatus: text("progress_status").notNull().default("대기중"),
  notes: text("notes"),
  photos: jsonb("photos").$type<string[]>().notNull().default([]),
  graphs: jsonb("graphs").$type<string[]>().notNull().default([]),
  attachments: jsonb("attachments").$type<Attachment[]>().notNull().default([]),
});

// Schemas for validation and types
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}).extend({
  username: z.string().min(3, "사용자명은 3자 이상이어야 합니다"),
  password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, userId: true });
export const projectSchema = createSelectSchema(projects);

export const insertTestItemSchema = createInsertSchema(testItems).omit({ id: true });
export const testItemSchema = createSelectSchema(testItems);

export const insertIssueItemSchema = createInsertSchema(issueItems).omit({ id: true });
export const issueItemSchema = createSelectSchema(issueItems);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type TestItem = typeof testItems.$inferSelect;
export type InsertTestItem = z.infer<typeof insertTestItemSchema>;
export type IssueItem = typeof issueItems.$inferSelect;
export type InsertIssueItem = z.infer<typeof insertIssueItemSchema>;

