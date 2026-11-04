ALTER TABLE "user" ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
-- Preserve every account and asset while removing the old profile.
UPDATE "user" SET "profileType"='propietario' WHERE "profileType"='arrendador' OR "profileType" IS NULL;
DO $$ DECLARE constraint_name TEXT; BEGIN
 FOR constraint_name IN SELECT conname FROM pg_constraint WHERE conrelid='"user"'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%profileType%'
 LOOP EXECUTE format('ALTER TABLE "user" DROP CONSTRAINT %I',constraint_name); END LOOP;
END $$;
ALTER TABLE "user" ADD CONSTRAINT user_profile_type_check CHECK ("profileType" IN ('propietario','inquilino'));
CREATE TABLE IF NOT EXISTS outbox_events (
 event_id UUID PRIMARY KEY,event_type TEXT NOT NULL,aggregate_id TEXT NOT NULL,payload JSONB NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),published_at TIMESTAMPTZ,attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS identity_outbox_pending_idx ON outbox_events(occurred_at) WHERE published_at IS NULL;
CREATE OR REPLACE FUNCTION publish_identity_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_uuid UUID:=gen_random_uuid(); event_name TEXT; BEGIN
 IF NEW.deletion_requested_at IS NOT NULL THEN RETURN NEW; END IF;
 event_name:=CASE WHEN TG_OP='INSERT' THEN 'identity.user.registered.v1' ELSE 'identity.user.updated.v1' END;
 INSERT INTO outbox_events(event_id,event_type,aggregate_id,payload) VALUES(event_uuid,event_name,NEW.id,
 jsonb_build_object('event_id',event_uuid,'event_type',event_name,'schema_version',1,'producer','identity','occurred_at',now(),
 'data',jsonb_build_object('user_id',NEW.id,'profile_type',NEW."profileType")));
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS identity_changes ON "user";
CREATE TRIGGER identity_changes AFTER INSERT OR UPDATE OF name,email,"profileType" ON "user" FOR EACH ROW EXECUTE FUNCTION publish_identity_change();


CREATE TABLE IF NOT EXISTS account_deletions(
 id UUID PRIMARY KEY,user_id TEXT UNIQUE,user_hash TEXT NOT NULL,unit_ids JSONB NOT NULL DEFAULT '[]',
 phase INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),completed_at TIMESTAMPTZ,expires_at TIMESTAMPTZ);
