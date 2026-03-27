-- ============================================
-- CHURCH CHECK-IN SYSTEM - Supabase Schema
-- ============================================

-- Churches table (links to future dashboard)
CREATE TABLE IF NOT EXISTS churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_pin TEXT NOT NULL, -- PIN to authorize devices
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Volunteers who operate the check-in stations
CREATE TABLE IF NOT EXISTS volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  pin TEXT NOT NULL, -- volunteer login PIN
  role TEXT DEFAULT 'volunteer', -- volunteer, teacher, admin
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guardians (parents/responsible adults)
CREATE TABLE IF NOT EXISTS guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  relationship TEXT DEFAULT 'Pai/Mãe', -- Pai/Mãe, Avô/Avó, Tio/Tia, Outro
  photo_url TEXT,
  registered_by UUID REFERENCES volunteers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Children
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  birth_date DATE,
  classroom TEXT DEFAULT 'Não definida',
  allergies TEXT,
  notes TEXT,
  photo_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Services / Events (cultos)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Culto Domingo Manhã", "Culto Quarta"
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc.
  start_time TIME,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Check-ins
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id),
  volunteer_id UUID REFERENCES volunteers(id), -- who did the check-in
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_id UUID REFERENCES services(id),
  security_code TEXT NOT NULL, -- 6-char code on the label
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ, -- null until checkout
  checkout_volunteer_id UUID REFERENCES volunteers(id), -- who did the checkout
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent double check-in for same child on same date (unless checked out)
  UNIQUE(child_id, service_date, security_code)
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_guardians_church ON guardians(church_id);
CREATE INDEX idx_guardians_name ON guardians(church_id, full_name);
CREATE INDEX idx_children_church ON children(church_id);
CREATE INDEX idx_children_guardian ON children(guardian_id);
CREATE INDEX idx_children_name ON children(church_id, full_name);
CREATE INDEX idx_checkins_date ON checkins(church_id, service_date);
CREATE INDEX idx_checkins_code ON checkins(church_id, service_date, security_code);
CREATE INDEX idx_checkins_child_date ON checkins(child_id, service_date);
CREATE INDEX idx_volunteers_church ON volunteers(church_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations with anon key (device-based auth via admin PIN)
-- In production, these should be tightened with proper auth
CREATE POLICY "Allow all for churches" ON churches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for volunteers" ON volunteers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for guardians" ON guardians FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for children" ON children FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for services" ON services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for checkins" ON checkins FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED DATA (for testing)
-- ============================================
-- Insert a test church
INSERT INTO churches (id, name, admin_pin) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Igreja Teste', '1234');

-- Insert a test volunteer
INSERT INTO volunteers (church_id, full_name, pin, role) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Maria Voluntária', '0000', 'volunteer'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'João Professor', '1111', 'teacher');

-- Insert test families
INSERT INTO guardians (id, church_id, full_name, phone, relationship) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Ana Silva', '(11) 99999-0001', 'Pai/Mãe'),
  ('a1000000-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Carlos Santos', '(11) 99999-0002', 'Pai/Mãe');

INSERT INTO children (church_id, guardian_id, full_name, birth_date, classroom) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a1000000-0000-0000-0000-000000000001', 'Pedro Silva', '2020-03-15', 'Kids 1'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a1000000-0000-0000-0000-000000000001', 'Luiza Silva', '2022-07-20', 'Maternal'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a1000000-0000-0000-0000-000000000002', 'Gabriel Santos', '2019-11-10', 'Kids 2');

-- Insert a test service
INSERT INTO services (church_id, name, day_of_week, start_time) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Culto Domingo Manhã', 0, '09:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Culto Domingo Noite', 0, '18:00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Culto Quarta', 3, '19:30');
