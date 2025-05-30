import type { RequestHandler } from "express";
import { storage } from "./storage";

// Simplified admin system - just check isAdmin boolean field

// Main admin middleware
export const isAdmin: RequestHandler = async (req: any, res, next) => {
  console.log("🔒 Admin middleware executing for:", req.path);
  
  try {
    // Check if user is authenticated (Supabase style)
    if (!req.user?.id) {
      console.log("❌ Admin access denied: User not authenticated");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      console.log("❌ Admin access denied: User not found");
      return res.status(403).json({ message: "Access denied. User not found." });
    }

    // Simple check: is the user marked as admin?
    if (!user.isAdmin) {
      console.log("🚫 Admin access denied: User is not an admin:", user.email, "isAdmin:", user.isAdmin);
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    // Add admin info to request for use in routes
    req.adminUser = {
      userId,
      email: user.email,
      isAdmin: true
    };

    console.log("✅ Admin access granted:", user.email);
    next();
  } catch (error) {
    console.error("❌ Admin auth error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Simple admin check - no complex permissions needed
export const requireAdmin: RequestHandler = (req: any, res, next) => {
  if (!req.adminUser || !req.adminUser.isAdmin) {
    return res.status(403).json({ message: "Admin authentication required" });
  }
  next();
};