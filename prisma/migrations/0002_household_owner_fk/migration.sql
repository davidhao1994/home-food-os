CREATE INDEX IF NOT EXISTS "households_ownerId_idx" ON "households"("ownerId");

ALTER TABLE "households"
ADD CONSTRAINT "households_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
