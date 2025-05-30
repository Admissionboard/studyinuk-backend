import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from 'express';
import { storage } from './storage';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// Server-side Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const requireAuth: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Ensure user exists in our database
    let dbUser = await storage.getUser(user.id);
    if (!dbUser) {
      dbUser = await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.full_name?.split(' ')[0] || null,
        lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
        profileImageUrl: user.user_metadata?.avatar_url || null,
      });
    }

    req.user = dbUser;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};