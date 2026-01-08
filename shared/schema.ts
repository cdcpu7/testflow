import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (keeping for compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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
  productImage: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["진행중", "완료", "보류"]).default("진행중"),
});

export const insertProjectSchema = projectSchema.omit({ id: true });

export type Project = z.infer<typeof projectSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;

// Test Item schema
export const testItemSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string().min(1, "시험항목명을 입력하세요"),
  description: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  testCompleted: z.boolean().default(false),
  reportCompleted: z.boolean().default(false),
  photos: z.array(z.string()).default([]),
  dataFiles: z.array(z.string()).default([]),
  numericData: z.string().optional(),
  notes: z.string().optional(),
});

export const insertTestItemSchema = testItemSchema.omit({ id: true });

export type TestItem = z.infer<typeof testItemSchema>;
export type InsertTestItem = z.infer<typeof insertTestItemSchema>;
