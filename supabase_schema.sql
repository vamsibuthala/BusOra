-- =========================================================
-- BusOra - Supabase PostgreSQL Database Schema
-- Run this script in the Supabase SQL Editor
-- =========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Routes Table
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    stops JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, name, lat, lng, order }
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Users Table (Role hierarchy: admin > driver > student)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'driver', 'student')),
    bus_id UUID,
    stop_id TEXT,
    phone TEXT DEFAULT '',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Buses Table
CREATE TABLE IF NOT EXISTS public.buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number TEXT UNIQUE NOT NULL,
    route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    capacity INTEGER DEFAULT 45,
    status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'delayed', 'offline', 'emergency')),
    last_lat DOUBLE PRECISION,
    last_lng DOUBLE PRECISION,
    last_speed DOUBLE PRECISION,
    last_location_at TIMESTAMPTZ,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add foreign key constraint to users.bus_id if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_bus' AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT fk_users_bus FOREIGN KEY (bus_id) REFERENCES public.buses(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Trips Table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE NOT NULL,
    driver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMPTZ,
    incidents JSONB DEFAULT '[]'::jsonb -- Array of { type, note, at }
);

-- 5. Bus Locations (GPS History)
CREATE TABLE IF NOT EXISTS public.bus_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_key TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Indexes for fast real-time queries
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_bus ON public.users(bus_id);
CREATE INDEX IF NOT EXISTS idx_buses_active ON public.buses(active);
CREATE INDEX IF NOT EXISTS idx_buses_status ON public.buses(status);
CREATE INDEX IF NOT EXISTS idx_trips_bus_status ON public.trips(bus_id, status);
CREATE INDEX IF NOT EXISTS idx_bus_locations_bus_created ON public.bus_locations(bus_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow anon & service role full access policies for simplicity in API proxy mode
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow all for authenticated/anon backend" ON public.users;
    DROP POLICY IF EXISTS "Allow all for authenticated/anon backend" ON public.routes;
    DROP POLICY IF EXISTS "Allow all for authenticated/anon backend" ON public.buses;
    DROP POLICY IF EXISTS "Allow all for authenticated/anon backend" ON public.trips;
    DROP POLICY IF EXISTS "Allow all for authenticated/anon backend" ON public.bus_locations;
    DROP POLICY IF EXISTS "Allow all for authenticated/anon backend" ON public.notifications;

    CREATE POLICY "Allow all for authenticated/anon backend" ON public.users FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for authenticated/anon backend" ON public.routes FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for authenticated/anon backend" ON public.buses FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for authenticated/anon backend" ON public.trips FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for authenticated/anon backend" ON public.bus_locations FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all for authenticated/anon backend" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Enable Realtime replication on public tables for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.buses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
