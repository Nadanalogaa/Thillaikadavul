-- Add discount fields to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2);

-- Add comments
COMMENT ON COLUMN invoices.original_amount IS 'Original fee amount before discount';
COMMENT ON COLUMN invoices.discount_percentage IS 'Discount percentage applied (0-100)';
COMMENT ON COLUMN invoices.discount_amount IS 'Absolute discount amount';
