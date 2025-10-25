# Run Migration - Simple One Command

Just one SQL file: `supabase-migrations.sql`

## Option 1: Via Supabase CLI (One Command)

```bash
supabase db execute --file supabase-migrations.sql --project-ref YOUR_PROJECT_REF
```

**To find your project ref:**

- Dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Or run: `supabase projects list`

That's it! ✅ Migration applied.

---

## Option 2: Via Supabase Dashboard (Copy & Paste)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the sidebar
4. Click **New Query**
5. Copy the entire contents of `supabase-migrations.sql`
6. Paste and click **Run**

Done! ✅

---

## What Gets Added

✅ `access_token` column to bookings table  
✅ Automatic UUID token generation  
✅ Index for fast lookups  
✅ Tokens for existing bookings  
✅ RLS policy for public access

---

## Safe to Run Multiple Times

The migration uses `IF NOT EXISTS` checks, so it's safe to run multiple times. It won't duplicate anything.
