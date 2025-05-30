import {
  users,
  universities,
  courses,
  counselors,
  favorites,
  applications,
  notifications,
  tutorials,
  adminUsers,
  type User,
  type UpsertUser,
  type University,
  type InsertUniversity,
  type Course,
  type InsertCourse,
  type CourseWithUniversity,
  type Counselor,
  type InsertCounselor,
  type Favorite,
  type InsertFavorite,
  type FavoriteWithCourse,
  type Application,
  type InsertApplication,
  type Notification,
  type InsertNotification,
  type Tutorial,
  type InsertTutorial,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, inArray, gte } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // University operations
  getUniversities(): Promise<University[]>;
  createUniversity(university: InsertUniversity): Promise<University>;

  // Course operations
  getCourses(filters?: { search?: string; faculty?: string; level?: string; ieltsScore?: string }): Promise<CourseWithUniversity[]>;
  getCourseById(id: number): Promise<CourseWithUniversity | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;

  // Counselor operations
  getCounselors(): Promise<Counselor[]>;
  createCounselor(counselor: InsertCounselor): Promise<Counselor>;

  // Favorites operations
  getUserFavorites(userId: string): Promise<FavoriteWithCourse[]>;
  addToFavorites(userId: string, courseId: number): Promise<Favorite>;
  removeFromFavorites(userId: string, courseId: number): Promise<void>;
  isFavorite(userId: string, courseId: number): Promise<boolean>;



  // Application operations
  createApplication(application: InsertApplication): Promise<Application>;
  getUserApplications(userId: string): Promise<any[]>;
  updateApplicationStatus(id: number, status: string): Promise<Application>;

  // Notification operations
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  // Tutorial operations
  getTutorials(): Promise<Tutorial[]>;
  createTutorial(tutorial: InsertTutorial): Promise<Tutorial>;

  // Admin operations
  getUsers(): Promise<User[]>;
  getAllApplications(): Promise<Application[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // Try to insert new user
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    } catch (error: any) {
      // If user already exists, update them
      if (error.code === '23505') { // unique constraint violation
        const [user] = await db
          .update(users)
          .set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userData.id))
          .returning();
        return user;
      }
      throw error;
    }
  }

  // University operations
  async getUniversities(): Promise<University[]> {
    return await db.select().from(universities);
  }

  async createUniversity(university: InsertUniversity): Promise<University> {
    const [created] = await db.insert(universities).values(university).returning();
    return created;
  }

  // Course operations
  async getCourses(filters?: { search?: string; faculty?: string; level?: string; ieltsScore?: string }): Promise<CourseWithUniversity[]> {
    let query = db
      .select()
      .from(courses)
      .leftJoin(universities, eq(courses.universityId, universities.id))

    const conditions = [];

    if (filters?.search) {
      conditions.push(ilike(courses.name, `%${filters.search}%`));
    }

    if (filters?.faculty && filters.faculty !== "All Faculties") {
      conditions.push(eq(courses.faculty, filters.faculty));
    }

    if (filters?.level && filters.level !== "All Levels") {
      conditions.push(eq(courses.level, filters.level));
    }

    if (filters?.ieltsScore && filters.ieltsScore !== "All IELTS Scores") {
      // Convert to numeric for proper comparison
      const numericScore = parseFloat(filters.ieltsScore);
      conditions.push(eq(courses.ieltsOverall, numericScore.toString()));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;

    return result.map((row) => ({
      ...row.courses,
      university: row.universities!,
    }));
  }

  async getCourseById(id: number): Promise<CourseWithUniversity | undefined> {
    const [result] = await db
      .select()
      .from(courses)
      .leftJoin(universities, eq(courses.universityId, universities.id))
      .where(eq(courses.id, id));

    if (!result) return undefined;

    return {
      ...result.courses,
      university: result.universities!,
    };
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [created] = await db.insert(courses).values(course).returning();
    return created;
  }

  // Counselor operations
  async getCounselors(): Promise<Counselor[]> {
    return await db.select().from(counselors).where(eq(counselors.isActive, true));
  }

  async createCounselor(counselor: InsertCounselor): Promise<Counselor> {
    const [created] = await db.insert(counselors).values(counselor).returning();
    return created;
  }

  // Favorites operations
  async getUserFavorites(userId: string): Promise<FavoriteWithCourse[]> {
    const favoriteList = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId));

    const result = [];
    for (const favorite of favoriteList) {
      const courseWithUniversity = await this.getCourseById(favorite.courseId);
      if (courseWithUniversity) {
        result.push({
          ...favorite,
          course: courseWithUniversity,
        });
      }
    }

    return result;
  }

  async addToFavorites(userId: string, courseId: number): Promise<Favorite> {
    const [created] = await db
      .insert(favorites)
      .values({ userId, courseId })
      .returning();
    return created;
  }

  async removeFromFavorites(userId: string, courseId: number): Promise<void> {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.courseId, courseId)));
  }

  async isFavorite(userId: string, courseId: number): Promise<boolean> {
    const result = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.courseId, courseId)))
      .limit(1);
    
    return result.length > 0;
  }

  // Application operations
  async createApplication(application: InsertApplication): Promise<Application> {
    const [created] = await db.insert(applications).values(application).returning();
    return created;
  }

  async getUserApplications(userId: string): Promise<any[]> {
    const result = await db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.createdAt));

    // Fetch course details for each application
    const applicationsWithCourses = await Promise.all(
      result.map(async (app) => {
        if (app.selectedCourses && app.selectedCourses.length > 0) {
          const courseDetails = await db
            .select({
              id: courses.id,
              name: courses.name,
              universityName: universities.name,
            })
            .from(courses)
            .leftJoin(universities, eq(courses.universityId, universities.id))
            .where(inArray(courses.id, app.selectedCourses));

          return {
            ...app,
            courseDetails,
          };
        }

        return {
          ...app,
          courseDetails: [],
        };
      })
    );

    return applicationsWithCourses;
  }

  async updateApplicationStatus(id: number, status: string): Promise<Application> {
    const [updated] = await db
      .update(applications)
      .set({ status, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return updated;
  }

  // Notification operations
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    console.log(`🔔 Creating notification in database:`, notification);
    const [created] = await db.insert(notifications).values(notification).returning();
    console.log(`✅ Notification created successfully:`, created);
    return created;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result.length;
  }

  // Tutorial operations
  async getTutorials(): Promise<Tutorial[]> {
    return await db
      .select()
      .from(tutorials)
      .where(eq(tutorials.isActive, true))
      .orderBy(desc(tutorials.createdAt));
  }

  async createTutorial(tutorial: InsertTutorial): Promise<Tutorial> {
    const [created] = await db.insert(tutorials).values(tutorial).returning();
    return created;
  }

  // Admin operations


  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllApplications(): Promise<Application[]> {
    return await db.select().from(applications).orderBy(desc(applications.createdAt));
  }
}

export const storage = new DatabaseStorage();
