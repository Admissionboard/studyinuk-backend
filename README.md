# StudyinUK Backend

## Deployment to Render

1. Upload this folder to a GitHub repository
2. Connect the repository to Render
3. Render will auto-detect the `render.yaml` configuration
4. Set these environment variables in Render:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key
5. Deploy

## Environment Variables Required
- NODE_ENV=production (auto-set)
- DATABASE_URL (auto-connected from PostgreSQL)
- SUPABASE_URL
- SUPABASE_SERVICE_KEY

## Local Development
```bash
npm install
npm run dev
```