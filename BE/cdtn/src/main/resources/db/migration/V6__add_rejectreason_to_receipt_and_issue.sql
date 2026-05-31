-- Add reject reason column to goodsreceipt and goodsissue
ALTER TABLE goodsreceipt ADD COLUMN rejectreason TEXT;
ALTER TABLE goodsissue ADD COLUMN rejectreason TEXT;
