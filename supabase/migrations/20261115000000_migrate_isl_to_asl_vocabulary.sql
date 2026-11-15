-- ============================================================================
-- GESTURA Database Migration: ISL to ASL Vocabulary Architecture
-- Version: 20261115000000
-- Description: Safely migrate active vocabulary to verified ASL (Yale ASL Signbank)
-- while strictly preserving historical ISL records and table relationships.
-- ============================================================================

-- 1. Create or ensure the vocabulary table exists with language metadata
CREATE TABLE IF NOT EXISTS public.vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sign_key TEXT NOT NULL,
    gloss TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'ASL',
    is_legacy BOOLEAN NOT NULL DEFAULT FALSE,
    category TEXT,
    description TEXT,
    video_url TEXT,
    signbank_id INTEGER,
    source TEXT DEFAULT 'ASL Signbank (Haskins Laboratories / Yale University)',
    license TEXT DEFAULT 'CC BY-NC-SA 4.0',
    avatar_animation TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT vocabulary_sign_lang_unique UNIQUE (sign_key, language)
);

-- 2. Add columns if table already existed under previous schema
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'ASL';
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS signbank_id INTEGER;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS license TEXT;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS avatar_animation TEXT;

-- 3. Mark existing pre-migration records as historical ISL records (preserving history)
UPDATE public.vocabulary
SET 
    language = 'ISL',
    is_legacy = TRUE,
    source = COALESCE(source, 'Historical GESTURA ISL Dataset')
WHERE language IS NULL OR language = 'ISL' OR is_legacy = TRUE;

-- 4. Enable Row Level Security (RLS) safely
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- 5. Safe, idempotent read policy for public/authenticated users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vocabulary' AND policyname = 'Allow public read access to active vocabulary'
    ) THEN
        CREATE POLICY "Allow public read access to active vocabulary"
            ON public.vocabulary
            FOR SELECT
            USING (true);
    END IF;
END $$;

-- 6. Insert / Upsert 31 Authentic ASL Signs from Yale ASL Signbank
INSERT INTO public.vocabulary (
    sign_key, gloss, language, is_legacy, category, description,
    video_url, signbank_id, source, license, avatar_animation
) VALUES
('hello', 'HELLO', 'ASL', false, 'Greetings', 'ASL salute: Open B-handshape touches temple and moves outward.', '/videos/asl/HELLO-1341.mp4', 1341, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', 'maya_hello_asl'),
('thank_you', 'THANK-YOU', 'ASL', false, 'Politeness', 'ASL thanks: Flat hand fingertips touch chin/lips and move forward.', '/videos/asl/THANK-YOU-2772.mp4', 2772, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', 'maya_thankyou_asl'),
('help', 'HELP', 'ASL', false, 'Needs / Emergency', 'ASL help: Dominant A-fist placed on flat non-dominant palm, lifted upward.', '/videos/asl/HELP-1345.mp4', 1345, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', 'maya_help_asl'),
('goodbye', 'GOODBYE', 'ASL', false, 'Greetings', 'ASL farewell: Open 5-hand at chest/shoulder level waving outward.', '/videos/asl/GOODBYE-1205.mp4', 1205, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', 'maya_goodbye_asl'),
('water', 'WATER', 'ASL', false, 'Everyday / Needs', 'ASL water: W-handshape index finger taps the chin twice.', '/videos/asl/WATER-3121.mp4', 3121, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('eat', 'EAT', 'ASL', false, 'Everyday / Needs', 'ASL eat: Flat O-handshape taps fingertips against the lips.', '/videos/asl/EAT-828.mp4', 828, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('pain', 'PAIN', 'ASL', false, 'Medical', 'ASL pain: Index fingers jab repeatedly toward each other at area of pain.', '/videos/asl/PAIN-2049.mp4', 2049, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('doctor', 'DOCTOR', 'ASL', false, 'Medical', 'ASL doctor: Dominant bent fingertips tap non-dominant wrist pulse.', '/videos/asl/DOCTOR-741.mp4', 741, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('hospital', 'HOSPITAL', 'ASL', false, 'Medical', 'ASL hospital: H-handshape draws a cross on non-dominant upper arm.', '/videos/asl/HOSPITAL-1391.mp4', 1391, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('emergency', 'EMERGENCY', 'ASL', false, 'Medical / Urgent', 'ASL emergency: E-handshape shakes side to side urgently.', '/videos/asl/EMERGENCY-861.mp4', 861, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('medicine', 'MEDICINE', 'ASL', false, 'Medical', 'ASL medicine: Middle finger pivots in the center of the non-dominant palm.', '/videos/asl/MEDICINE-1827.mp4', 1827, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('bathroom', 'BATHROOM', 'ASL', false, 'Everyday / Needs', 'ASL bathroom: T-handshape shakes side to side.', '/videos/asl/BATHROOM-196.mp4', 196, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('please', 'PLEASE', 'ASL', false, 'Politeness', 'ASL please: Flat open hand rubs clockwise circular motion on chest.', '/videos/asl/PLEASE-2154.mp4', 2154, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('yes', 'YES', 'ASL', false, 'Conversational', 'ASL yes: S-fist nods up and down like a nodding head.', '/videos/asl/YES-3290.mp4', 3290, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('no', 'NO', 'ASL', false, 'Conversational', 'ASL no: Index and middle fingers snap down against thumb.', '/videos/asl/NO-1960.mp4', 1960, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('stop', 'STOP', 'ASL', false, 'Directives', 'ASL stop: Dominant open hand chops downward into non-dominant palm.', '/videos/asl/STOP-2664.mp4', 2664, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('wait', 'WAIT', 'ASL', false, 'Directives', 'ASL wait: Open curved hands wiggle fingers upward in front of chest.', '/videos/asl/WAIT-3097.mp4', 3097, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('need', 'NEED', 'ASL', false, 'Needs', 'ASL need: X-handshape bends downward emphatically.', '/videos/asl/NEED-1937.mp4', 1937, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('want', 'WANT', 'ASL', false, 'Needs', 'ASL want: Open claw hands pull backward toward body.', '/videos/asl/WANT-3110.mp4', 3110, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('i', 'I', 'ASL', false, 'Pronouns', 'ASL I: Index finger points to center of chest.', '/videos/asl/I-1422.mp4', 1422, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('you', 'YOU', 'ASL', false, 'Pronouns', 'ASL you: Index finger points forward toward interlocutor.', '/videos/asl/YOU-3294.mp4', 3294, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('where', 'WHERE', 'ASL', false, 'Questions', 'ASL where: Index finger held upright shakes side to side.', '/videos/asl/WHERE-3144.mp4', 3144, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('when', 'WHEN', 'ASL', false, 'Questions', 'ASL when: Dominant index finger circles non-dominant index and touches tip.', '/videos/asl/WHEN-3141.mp4', 3141, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('why', 'WHY', 'ASL', false, 'Questions', 'ASL why: Open hand touches forehead then pulls down into Y-handshape.', '/videos/asl/WHY-3163.mp4', 3163, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('friend', 'FRIEND', 'ASL', false, 'Everyday', 'ASL friend: Interlocking index finger hooks swap positions.', '/videos/asl/FRIEND-1109.mp4', 1109, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('family', 'FAMILY', 'ASL', false, 'Everyday', 'ASL family: F-handshapes circle around until pinkies touch.', '/videos/asl/FAMILY-948.mp4', 948, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('today', 'TODAY', 'ASL', false, 'Time', 'ASL today: Y-handshapes bounce downward twice.', '/videos/asl/TODAY-2853.mp4', 2853, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('now', 'NOW', 'ASL', false, 'Time', 'ASL now: Bent Y-handshapes drop downward in front of body.', '/videos/asl/NOW-1974.mp4', 1974, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('tomorrow', 'TOMORROW', 'ASL', false, 'Time', 'ASL tomorrow: A-thumb touches cheek and rotates forward.', '/videos/asl/TOMORROW-2862.mp4', 2862, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('learn', 'LEARN', 'ASL', false, 'Education', 'ASL learn: Flat hand lifts information from non-dominant palm to forehead.', '/videos/asl/LEARN-1636.mp4', 1636, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL),
('love', 'LOVE', 'ASL', false, 'Expressive', 'ASL love: Arms crossed with fists over center of chest.', '/videos/asl/LOVE-1735.mp4', 1735, 'ASL Signbank (Haskins Laboratories / Yale University)', 'CC BY-NC-SA 4.0', NULL)
ON CONFLICT (sign_key, language) DO UPDATE SET
    gloss = EXCLUDED.gloss,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    video_url = EXCLUDED.video_url,
    signbank_id = EXCLUDED.signbank_id,
    source = EXCLUDED.source,
    license = EXCLUDED.license,
    avatar_animation = EXCLUDED.avatar_animation,
    updated_at = timezone('utc'::text, now());
