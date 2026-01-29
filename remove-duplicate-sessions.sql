-- Step 1: Find duplicate sessions (same name, creator, and description)
SELECT 
    session_name,
    created_by,
    description,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id ORDER BY created_at) as session_ids
FROM collaboration_sessions
GROUP BY session_name, created_by, description
HAVING COUNT(*) > 1;

-- Step 2: Delete duplicate sessions (keeps the oldest one, removes newer duplicates)
-- Run this AFTER reviewing the results from Step 1
WITH duplicates AS (
    SELECT 
        id,
        session_name,
        created_by,
        ROW_NUMBER() OVER (
            PARTITION BY session_name, created_by, description 
            ORDER BY created_at ASC
        ) as rn
    FROM collaboration_sessions
)
DELETE FROM collaboration_sessions
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Step 3: Verify the cleanup
SELECT 
    id,
    session_name,
    created_by,
    created_at,
    is_active
FROM collaboration_sessions
WHERE created_by IN (
    SELECT DISTINCT created_by 
    FROM collaboration_sessions 
    WHERE session_name ILIKE '%Help:%'
)
ORDER BY created_at DESC;

-- Step 4: (Optional) Add a unique constraint to prevent future duplicates
-- WARNING: Only run this if you want to prevent identical session names from the same creator
-- CREATE UNIQUE INDEX unique_session_per_creator 
-- ON collaboration_sessions (created_by, session_name) 
-- WHERE is_active = true;
