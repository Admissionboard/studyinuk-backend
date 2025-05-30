import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./supabaseAuth";
import { isAdmin } from "./adminAuth";
import { seedSampleData } from "./seed-data";
import { insertApplicationSchema } from "@shared/schema";
import { z } from "zod";
import { adminDb } from "./db";
import { users, applications, courses, universities } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {

  // Health check endpoint for deployment monitoring
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Auth route - get current user
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Create user record in our database
  app.post('/api/auth/create-user', requireAuth, async (req: any, res) => {
    try {
      const userData = {
        id: req.user.id,
        email: req.user.email,
        firstName: req.body.firstName || null,
        lastName: req.body.lastName || null,
        profileImageUrl: req.user.user_metadata?.avatar_url || null,
      };
      
      const user = await storage.upsertUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Test route to check if auth is working
  app.get('/api/test-auth', requireAuth, async (req: any, res) => {
    res.json({ message: 'Auth working', userId: req.user.id });
  });

  // Course routes
  app.get('/api/courses', async (req, res) => {
    try {
      const { search, faculty, level, ieltsScore } = req.query;
      const filters = {
        search: search as string,
        faculty: faculty as string,
        level: level as string,
        ieltsScore: ieltsScore as string,
      };
      const courses = await storage.getCourses(filters);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get('/api/courses/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const course = await storage.getCourseById(id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // University routes
  app.get('/api/universities', async (req, res) => {
    try {
      const universities = await storage.getUniversities();
      res.json(universities);
    } catch (error) {
      console.error("Error fetching universities:", error);
      res.status(500).json({ message: "Failed to fetch universities" });
    }
  });

  // Counselor routes
  app.get('/api/counselors', async (req, res) => {
    try {
      const counselors = await storage.getCounselors();
      res.json(counselors);
    } catch (error) {
      console.error("Error fetching counselors:", error);
      res.status(500).json({ message: "Failed to fetch counselors" });
    }
  });



  // Application routes
  app.get('/api/applications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const applications = await storage.getUserApplications(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post('/api/applications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const applicationData = insertApplicationSchema.parse({ 
        ...req.body, 
        userId,
        status: "Submitted" // Ensure all new applications start with "Submitted" status
      });
      const application = await storage.createApplication(applicationData);
      
      // Create a notification for the user with course details
      try {
        let notificationMessage = `Your application #${application.id} has been submitted. A counsellor will contact you within 6 working hours.`;
        
        // Get course and university details for enhanced notification
        if (applicationData.selectedCourses && applicationData.selectedCourses.length > 0) {
          try {
            const courseDetails = await storage.getCourseById(applicationData.selectedCourses[0]);
            console.log("🎯 Course lookup result:", courseDetails);
            if (courseDetails && courseDetails.university) {
              notificationMessage = `Your application to "${courseDetails.university.name}" for ${courseDetails.name} has been submitted. A counsellor will contact you within 6 working hours.`;
              console.log("🎯 Enhanced message created:", notificationMessage);
            }
          } catch (courseError) {
            console.error("Course lookup failed:", courseError);
          }
        }

        await storage.createNotification({
          userId,
          title: "Application Submitted Successfully", 
          message: notificationMessage,
          type: "application",
          isRead: false
        });
        console.log("🎯 Notification created with message:", notificationMessage);
      } catch (notificationError) {
        console.error("Failed to create notification:", notificationError);
        // Don't fail the application creation if notification fails
      }
      
      res.json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  // Simple in-memory favorites storage for demo
  const favoritesStore = new Map();

  app.get('/api/favorites', async (req: any, res) => {
    const favorites = Array.from(favoritesStore.values());
    res.json(favorites);
  });

  app.post('/api/favorites', async (req: any, res) => {
    const { courseId } = req.body;
    const course = await storage.getCourseById(parseInt(courseId));
    
    if (course) {
      const favorite = {
        id: Date.now(),
        courseId: parseInt(courseId),
        course: course
      };
      favoritesStore.set(courseId.toString(), favorite);
      res.status(201).json(favorite);
    } else {
      res.status(404).json({ message: "Course not found" });
    }
  });

  app.delete('/api/favorites/:courseId', async (req: any, res) => {
    const courseId = req.params.courseId;
    const deleted = favoritesStore.delete(courseId);
    console.log(`Deleting favorite ${courseId}, success: ${deleted}, remaining:`, Array.from(favoritesStore.keys()));
    res.status(200).json({ message: "Removed from favorites", deleted });
  });

  app.get('/api/favorites/check/:courseId', async (req: any, res) => {
    const courseId = req.params.courseId;
    const isFavorite = favoritesStore.has(courseId);
    res.json({ isFavorite });
  });

  // Notification routes
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread-count', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Tutorial routes
  app.get('/api/tutorials', async (req, res) => {
    try {
      const tutorials = await storage.getTutorials();
      res.json(tutorials);
    } catch (error) {
      console.error("Error fetching tutorials:", error);
      res.status(500).json({ message: "Failed to fetch tutorials" });
    }
  });

  // Seed data route (for development)
  app.post('/api/seed', async (req, res) => {
    try {
      await seedSampleData();
      res.json({ message: "Sample data seeded successfully" });
    } catch (error) {
      console.error("Error seeding data:", error);
      res.status(500).json({ message: "Failed to seed data" });
    }
  });

  // New working admin stats endpoint
  app.get('/api/admin-dashboard-stats', requireAuth, async (req: any, res) => {
    console.log("🚀 NEW ADMIN STATS ENDPOINT CALLED");
    try {
      console.log("User ID:", req.user?.id);
      
      const allUsers = await storage.getUsers();
      const allApplications = await storage.getAllApplications();
      const allCourses = await storage.getCourses();
      const allUniversities = await storage.getUniversities();
      
      console.log("Data counts:", {
        users: allUsers.length,
        applications: allApplications.length,
        courses: allCourses.length,
        universities: allUniversities.length
      });
      
      const stats = {
        totalUsers: allUsers.length,
        totalApplications: allApplications.length,
        totalCourses: allCourses.length,
        totalUniversities: allUniversities.length,
        newUsersThisWeek: 0,
        newApplicationsThisWeek: 0,
        conversionRate: allUsers.length > 0 ? Math.round((allApplications.length / allUsers.length) * 100) : 0
      };
      
      console.log("Sending stats:", stats);
      res.json(stats);
    } catch (error) {
      console.error("Error in new stats endpoint:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Admin API endpoints - check if user has admin privileges
  app.get('/api/admin/stats', requireAuth, async (req: any, res) => {
    console.log("🔥 ADMIN STATS ENDPOINT CALLED - NEW VERSION");
    try {
      console.log("📊 Admin stats request from user:", req.user?.id);
      
      // Check if user is admin
      const currentUser = await storage.getUser(req.user.id);
      console.log("👤 Current user:", currentUser);
      console.log("🔐 Is admin?", currentUser?.isAdmin);
      
      if (!currentUser?.isAdmin) {
        console.log("🚫 Admin access denied for user:", req.user.id);
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get data using storage interface
      const allUsers = await storage.getUsers();
      const allApplications = await storage.getAllApplications();
      const allCourses = await storage.getCourses();
      const allUniversities = await storage.getUniversities();

      console.log("📊 Data fetched:", {
        usersCount: allUsers.length,
        applicationsCount: allApplications.length,
        coursesCount: allCourses.length,
        universitiesCount: allUniversities.length
      });

      // Calculate conversion rates correctly
      const usersWithApplications = Array.from(new Set(allApplications.map(app => app.userId)));
      const usersWithVisaApproved = Array.from(new Set(allApplications
        .filter(app => app.status === 'Visa Approved')
        .map(app => app.userId)));

      console.log("🔢 Conversion Rate Calculations:");
      console.log("Total users:", allUsers.length);
      console.log("Users with applications:", usersWithApplications);
      console.log("Users with applications count:", usersWithApplications.length);
      console.log("Users with visa approved:", usersWithVisaApproved);
      console.log("Users with visa approved count:", usersWithVisaApproved.length);

      const stats = {
        totalUsers: allUsers.length,
        totalApplications: allApplications.length,
        totalCourses: allCourses.length,
        totalUniversities: allUniversities.length,
        newUsersThisWeek: allUsers.filter(u => {
          if (!u.createdAt) return false;
          const userDate = new Date(u.createdAt);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return userDate > weekAgo;
        }).length,
        newApplicationsThisWeek: allApplications.filter(a => {
          if (!a.createdAt) return false;
          const appDate = new Date(a.createdAt);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return appDate > weekAgo;
        }).length,
        conversionRate: allUsers.length > 0 ? Math.round((usersWithApplications.length / allUsers.length) * 100) : 0,
        finalConversionRate: usersWithApplications.length > 0 ? Math.round((usersWithVisaApproved.length / usersWithApplications.length) * 100) : 0
      };

      console.log("📊 Returning stats:", stats);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/admin/users', requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/applications', requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const applications = await storage.getAllApplications();
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get('/api/admin/leads', requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get('/api/admin/analytics', requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const users = await storage.getUsers();
      const applications = await storage.getAllApplications();
      
      const analytics = {
        userRegistrations: users.map(u => ({
          date: u.createdAt,
          count: 1
        })),
        applicationSubmissions: applications.map(a => ({
          date: a.createdAt,
          count: 1,
          status: a.status
        }))
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Application status update endpoint with automatic notification
  app.patch('/api/admin/applications/:id/status', requireAuth, async (req: any, res) => {
    console.log(`🔥 Application status update endpoint called for ID: ${req.params.id}`);
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser?.isAdmin) {
        console.log(`❌ Admin access denied for user: ${req.user.id}`);
        return res.status(403).json({ message: "Admin access required" });
      }

      const applicationId = parseInt(req.params.id);
      const { status } = req.body;
      console.log(`📝 Updating application ${applicationId} to status: ${status}`);

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      // Get the application first to find the user
      const applications = await storage.getAllApplications();
      const application = applications.find(app => app.id === applicationId);
      console.log(`🔍 Found application:`, application);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Update the application status
      const updatedApplication = await storage.updateApplicationStatus(applicationId, status);
      console.log(`✅ Application status updated successfully`);

      // Get course details for the notification
      const courses = await storage.getCourses();
      const universities = await storage.getUniversities();
      
      let courseInfo = "your application";
      if (application.selectedCourses && application.selectedCourses.length > 0) {
        const course = courses.find(c => c.id === application.selectedCourses[0]);
        if (course) {
          const university = universities.find(u => u.id === course.universityId);
          courseInfo = `${course.name}${university ? ` at ${university.name}` : ''}`;
        }
      }

      console.log(`🔔 About to create notification for user: ${application.userId}`);
      // Create notification for the user
      await storage.createNotification({
        userId: application.userId,
        type: 'application',
        title: 'Application Status Updated',
        message: `Your application status for ${courseInfo} has been updated to: ${status}`,
        isRead: false
      });

      console.log(`✅ Application ${applicationId} status updated to "${status}" and notification sent to user ${application.userId}`);
      console.log(`🔔 Created notification:`, { userId: application.userId, type: 'application', title: 'Application Status Updated' });
      
      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating application status:", error);
      res.status(500).json({ message: "Failed to update application status" });
    }
  });

  // Admin notification sending endpoint  
  app.post('/api/admin/notifications', requireAuth, async (req: any, res) => {
    console.log(`🔥 Admin notification endpoint called`);
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser?.isAdmin) {
        console.log(`❌ Admin access denied for user: ${req.user.id}`);
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userIds, type, title, message } = req.body;
      console.log(`📨 Admin notification request:`, { userIds, type, title, message });

      if (!type || !title || !message) {
        return res.status(400).json({ message: "Missing required fields: type, title, message" });
      }

      // Get all users if sending to all, otherwise use selected userIds
      let targetUsers = [];
      if (!userIds || userIds.length === 0) {
        // Send to all users
        targetUsers = await storage.getUsers();
        console.log(`📢 Sending notification to all ${targetUsers.length} users`);
      } else {
        // Send to specific users
        targetUsers = userIds.map((id: string) => ({ id }));
        console.log(`📢 Sending notification to ${targetUsers.length} specific users:`, userIds);
      }

      // Create notifications for each target user
      const notifications = [];
      for (const user of targetUsers) {
        console.log(`🔔 Creating notification for user: ${user.id}`);
        const notification = await storage.createNotification({
          userId: user.id,
          type,
          title,
          message,
          isRead: false
        });
        notifications.push(notification);
      }

      console.log(`✅ Admin notifications sent to ${notifications.length} users: ${title}`);
      res.json({ success: true, message: `Notification sent to ${notifications.length} users`, notifications });
    } catch (error) {
      console.error("Error sending admin notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // SEO Routes - Sitemap and robots.txt
  app.get('/api/sitemap.xml', async (req, res) => {
    try {
      const courses = await storage.getCourses();
      const universities = await storage.getUniversities();
      
      const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'daily' },
        { url: '/courses', priority: '0.9', changefreq: 'daily' },
        { url: '/counselors', priority: '0.8', changefreq: 'weekly' },
        { url: '/office-location', priority: '0.7', changefreq: 'monthly' },
        { url: '/privacy-policy', priority: '0.5', changefreq: 'yearly' }
      ];

      const dynamicPages = [
        ...courses.map(course => ({
          url: `/course/${course.id}/${course.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          priority: '0.8',
          changefreq: 'weekly'
        })),
        ...universities.map(university => ({
          url: `/university/${university.id}/${university.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          priority: '0.7',
          changefreq: 'weekly'
        }))
      ];

      const allPages = [...staticPages, ...dynamicPages];
      const baseUrl = 'https://studyinuk.co';
      
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

      res.set('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // Serve robots.txt
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /private
Disallow: /*?*
Allow: /api/sitemap.xml

Sitemap: https://studyinuk.co/api/sitemap.xml`);
  });

  const httpServer = createServer(app);
  return httpServer;
}