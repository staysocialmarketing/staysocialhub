-- Premiere Dashboard - Phase 1: Expense Tracking
-- Created: 2026-06-20

-- Upload tracking
CREATE TABLE IF NOT EXISTS premiere_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  row_count INTEGER,
  date_range_start DATE,
  date_range_end DATE,
  gl_account TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual expense transactions
CREATE TABLE IF NOT EXISTS premiere_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES premiere_uploads(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  transaction_type TEXT,
  ref_number TEXT,
  vendor_name TEXT,
  description TEXT,
  gl_account TEXT,
  payment_method TEXT,
  amount DECIMAL(12,2) NOT NULL,
  balance DECIMAL(12,2),
  category TEXT,
  auto_categorized BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_premiere_expenses_date ON premiere_expenses(transaction_date);
CREATE INDEX IF NOT EXISTS idx_premiere_expenses_upload ON premiere_expenses(upload_id);
CREATE INDEX IF NOT EXISTS idx_premiere_expenses_vendor ON premiere_expenses(vendor_name);
CREATE INDEX IF NOT EXISTS idx_premiere_expenses_category ON premiere_expenses(category);

-- RLS policies
ALTER TABLE premiere_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE premiere_expenses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read uploads" ON premiere_uploads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read expenses" ON premiere_expenses
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can insert uploads" ON premiere_uploads
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can insert expenses" ON premiere_expenses
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to delete (for replacing uploads)
CREATE POLICY "Authenticated users can delete uploads" ON premiere_uploads
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete expenses" ON premiere_expenses
  FOR DELETE TO authenticated USING (true);

-- Allow authenticated users to update (for manual re-categorization)
CREATE POLICY "Authenticated users can update expenses" ON premiere_expenses
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
