-- Fix VARCHAR length constraints in users table
-- This addresses "value too long for type character varying(20)" errors

DO $$ 
BEGIN
    -- Fix common fields that might have VARCHAR(20) constraints
    
    -- Fix name field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN name TYPE TEXT;
        RAISE NOTICE 'Fixed name column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix name column: %', SQLERRM;
    END;
    
    -- Fix email field if it has length constraint  
    BEGIN
        ALTER TABLE users ALTER COLUMN email TYPE TEXT;
        RAISE NOTICE 'Fixed email column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix email column: %', SQLERRM;
    END;
    
    -- Fix contact_number field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN contact_number TYPE TEXT;
        RAISE NOTICE 'Fixed contact_number column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix contact_number column: %', SQLERRM;
    END;
    
    -- Fix father_name field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN father_name TYPE TEXT;
        RAISE NOTICE 'Fixed father_name column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix father_name column: %', SQLERRM;
    END;
    
    -- Fix standard field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN standard TYPE TEXT;
        RAISE NOTICE 'Fixed standard column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix standard column: %', SQLERRM;
    END;
    
    -- Fix school_name field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN school_name TYPE TEXT;
        RAISE NOTICE 'Fixed school_name column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix school_name column: %', SQLERRM;
    END;
    
    -- Fix grade field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN grade TYPE TEXT;
        RAISE NOTICE 'Fixed grade column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix grade column: %', SQLERRM;
    END;
    
    -- Fix address field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN address TYPE TEXT;
        RAISE NOTICE 'Fixed address column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix address column: %', SQLERRM;
    END;
    
    -- Fix city field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN city TYPE TEXT;
        RAISE NOTICE 'Fixed city column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix city column: %', SQLERRM;
    END;
    
    -- Fix state field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN state TYPE TEXT;
        RAISE NOTICE 'Fixed state column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix state column: %', SQLERRM;
    END;
    
    -- Fix country field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN country TYPE TEXT;
        RAISE NOTICE 'Fixed country column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix country column: %', SQLERRM;
    END;
    
    -- Fix postal_code field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN postal_code TYPE TEXT;
        RAISE NOTICE 'Fixed postal_code column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix postal_code column: %', SQLERRM;
    END;
    
    -- Fix role field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN role TYPE TEXT;
        RAISE NOTICE 'Fixed role column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix role column: %', SQLERRM;
    END;
    
    -- Fix class_preference field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN class_preference TYPE TEXT;
        RAISE NOTICE 'Fixed class_preference column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix class_preference column: %', SQLERRM;
    END;
    
    -- Fix sex field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN sex TYPE TEXT;
        RAISE NOTICE 'Fixed sex column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix sex column: %', SQLERRM;
    END;
    
    -- Fix employment_type field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN employment_type TYPE TEXT;
        RAISE NOTICE 'Fixed employment_type column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix employment_type column: %', SQLERRM;
    END;
    
    -- Fix status field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN status TYPE TEXT;
        RAISE NOTICE 'Fixed status column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix status column: %', SQLERRM;
    END;
    
    -- Fix timezone field if it has length constraint
    BEGIN
        ALTER TABLE users ALTER COLUMN timezone TYPE TEXT;
        RAISE NOTICE 'Fixed timezone column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix timezone column: %', SQLERRM;
    END;

END $$;