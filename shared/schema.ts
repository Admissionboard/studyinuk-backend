import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Universities table
export const universities = pgTable("universities", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  city: varchar("city").notNull(),
  country: varchar("country").notNull(),
  googleMapUrl: varchar("google_map_url"),
  imageUrl: varchar("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  universityId: integer("university_id").references(() => universities.id).notNull(),
  level: varchar("level").notNull(), // Bachelor's, Master's, PhD
  duration: varchar("duration").notNull(), // "3 Years", "2 Years", etc.
  tuitionFee: decimal("tuition_fee", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("GBP"),
  ieltsOverall: decimal("ielts_overall", { precision: 2, scale: 1 }).notNull(),
  ieltsListening: decimal("ielts_listening", { precision: 2, scale: 1 }),
  ieltsReading: decimal("ielts_reading", { precision: 2, scale: 1 }),
  ieltsWriting: decimal("ielts_writing", { precision: 2, scale: 1 }),
  ieltsSpeaking: decimal("ielts_speaking", { precision: 2, scale: 1 }),
  faculty: varchar("faculty").notNull(),
  scholarships: text("scholarships").array(),
  startDates: varchar("start_dates"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  universityIdIdx: index("courses_university_id_idx").on(table.universityId),
  facultyIdx: index("courses_faculty_idx").on(table.faculty),
  levelIdx: index("courses_level_idx").on(table.level),
  ieltsOverallIdx: index("courses_ielts_overall_idx").on(table.ieltsOverall),
  nameIdx: index("courses_name_idx").on(table.name),
}));

// Counselors table
export const counselors = pgTable("counselors", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  title: varchar("title").notNull(),
  whatsapp: varchar("whatsapp").notNull(),
  languages: varchar("languages").array().notNull(),
  experience: varchar("experience"),
  profileImageUrl: varchar("profile_image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Favorites table
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Applications table
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fullName: varchar("full_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone").notNull(),
  selectedCourses: integer("selected_courses").array().notNull(),
  additionalNotes: text("additional_notes"),
  status: varchar("status").default("submitted"), // Application status stages
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  type: varchar("type").default("info"), // info, application, appointment, critical
  createdAt: timestamp("created_at").defaultNow(),
});

// Tutorials table
export const tutorials = pgTable("tutorials", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  youtubeUrl: varchar("youtube_url").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  category: varchar("category").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// CRM - Leads table for managing prospects before they become users
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  source: varchar("source", { length: 50 }).notNull(), // facebook, google, reference, website
  status: varchar("status", { length: 50 }).default("new"), // new, contacted, interested, converted, closed
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high
  notes: text("notes"),
  referredBy: varchar("referred_by", { length: 255 }),
  interestedCourses: text("interested_courses").array(),
  lastContactedAt: timestamp("last_contacted_at"),
  convertedUserId: varchar("converted_user_id").references(() => users.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin users table for role-based access
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 50 }).default("admin"), // admin, super_admin, counselor
  permissions: text("permissions").array().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lead activities for tracking all interactions
export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  type: varchar("type", { length: 50 }).notNull(), // email, whatsapp, call, note, meeting
  subject: varchar("subject", { length: 255 }),
  content: text("content"),
  status: varchar("status", { length: 50 }).default("completed"), // scheduled, completed, failed
  scheduledAt: timestamp("scheduled_at"),
  performedBy: varchar("performed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const universitiesRelations = relations(universities, ({ many }) => ({
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  university: one(universities, {
    fields: [courses.universityId],
    references: [universities.id],
  }),
  favorites: many(favorites),
}));

export const usersRelations = relations(users, ({ many }) => ({
  favorites: many(favorites),
  applications: many(applications),
  notifications: many(notifications),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [favorites.courseId],
    references: [courses.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  convertedUser: one(users, {
    fields: [leads.convertedUserId],
    references: [users.id],
  }),
  assignedToUser: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
  }),
  activities: many(leadActivities),
}));

export const adminUsersRelations = relations(adminUsers, ({ one }) => ({
  user: one(users, {
    fields: [adminUsers.userId],
    references: [users.id],
  }),
}));

export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, {
    fields: [leadActivities.leadId],
    references: [leads.id],
  }),
  performedByUser: one(users, {
    fields: [leadActivities.performedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUniversitySchema = createInsertSchema(universities).omit({
  id: true,
  createdAt: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
});

export const insertCounselorSchema = createInsertSchema(counselors).omit({
  id: true,
  createdAt: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});



export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertTutorialSchema = createInsertSchema(tutorials).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
});

export const insertLeadActivitySchema = createInsertSchema(leadActivities).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type University = typeof universities.$inferSelect;
export type InsertUniversity = z.infer<typeof insertUniversitySchema>;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Counselor = typeof counselors.$inferSelect;
export type InsertCounselor = z.infer<typeof insertCounselorSchema>;

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Tutorial = typeof tutorials.$inferSelect;
export type InsertTutorial = z.infer<typeof insertTutorialSchema>;

// Extended types for joined data
export type CourseWithUniversity = Course & {
  university: University;
};

export type FavoriteWithCourse = Favorite & {
  course: CourseWithUniversity;
};



// CRM Types
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = z.infer<typeof insertLeadActivitySchema>;

// Extended CRM types
export type LeadWithActivities = Lead & {
  activities: LeadActivity[];
  convertedUser?: User;
  assignedToUser?: User;
};

export type AdminUserWithUser = AdminUser & {
  user: User;
};
