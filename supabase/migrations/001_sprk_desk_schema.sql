-- ============================================================================
-- SPRK Desk — Complete Single-Run Supabase Database Schema & Security Policies
-- Project ID: xsvwqpajrmflsocxedaa
-- Run this entire script once in the Supabase SQL Editor to initialize tables,
-- triggers, RPCs, storage buckets, and Row-Level Security policies.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Helper Functions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_public_id()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'SPK-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Core User, Profile & Access Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_id text UNIQUE NOT NULL DEFAULT public.generate_public_id(),
  username text UNIQUE,
  display_name text NOT NULL DEFAULT 'Student',
  avatar_preset text NOT NULL DEFAULT '☺',
  avatar_url text NOT NULL DEFAULT '',
  banner_url text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  course_class text NOT NULL DEFAULT '',
  exam_aim text NOT NULL DEFAULT '',
  favorite_subjects text[] NOT NULL DEFAULT '{}',
  is_verified boolean NOT NULL DEFAULT false,
  privacy jsonb NOT NULL DEFAULT '{"showOnlineStatus":true,"showStudyActivity":true,"allowRoomVisits":true,"roomVisibility":"friends"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_format CHECK (
    username IS NULL OR username ~ '^[a-z0-9_]{3,24}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON public.profiles (public_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (lower(username));

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entitlement)
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'comic',
  time_of_day text NOT NULL DEFAULT 'auto',
  weather text NOT NULL DEFAULT 'clear',
  lighting jsonb NOT NULL DEFAULT '{}'::jsonb,
  skins jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked_skins jsonb NOT NULL DEFAULT '{}'::jsonb,
  decorations jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_prop jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout_locked boolean NOT NULL DEFAULT false,
  active_layout_name text NOT NULL DEFAULT 'Default Desk',
  reduced_motion boolean NOT NULL DEFAULT false,
  low_performance boolean NOT NULL DEFAULT false,
  local_display_name text NOT NULL DEFAULT 'Student',
  active_music_id text,
  active_ambience_id text,
  app_mode text NOT NULL DEFAULT 'cozy',
  serious_mode boolean NOT NULL DEFAULT false,
  hide_gamification boolean NOT NULL DEFAULT false,
  strict_focus_lock boolean NOT NULL DEFAULT false,
  auto_cycle_breaks boolean NOT NULL DEFAULT true,
  default_focus_minutes integer NOT NULL DEFAULT 25,
  mute_chimes boolean NOT NULL DEFAULT false,
  low_pass_hz integer NOT NULL DEFAULT 18000,
  auto_dusk_lamp boolean NOT NULL DEFAULT false,
  study_together_visual_mode boolean NOT NULL DEFAULT false,
  deep_focus jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.room_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default Desk',
  layout_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

DROP TRIGGER IF EXISTS trg_room_layouts_updated_at ON public.room_layouts;
CREATE TRIGGER trg_room_layouts_updated_at
  BEFORE UPDATE ON public.room_layouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Social Graph: Friend Requests, Friendships & Notifications
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friend_requests_no_self CHECK (sender_id <> receiver_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_pending_pair
  ON public.friend_requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests (receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests (sender_id, status);

DROP TRIGGER IF EXISTS trg_friend_requests_updated_at ON public.friend_requests;
CREATE TRIGGER trg_friend_requests_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_ordered_pair CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON public.friendships (user_a);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON public.friendships (user_b);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Social Feed (Posts, Likes, Comments)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 800),
  subject text NOT NULL DEFAULT 'General Study',
  post_type text NOT NULL DEFAULT 'update' CHECK (post_type IN ('update', 'milestone', 'question', 'resource', 'reflection')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends')),
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_created ON public.social_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_author ON public.social_posts (author_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_social_posts_updated_at ON public.social_posts;
CREATE TRIGGER trg_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.social_post_likes (
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.social_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 400),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_comments_post ON public.social_post_comments (post_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_post_likes_count ON public.social_post_likes;
CREATE TRIGGER trg_social_post_likes_count
  AFTER INSERT OR DELETE ON public.social_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

CREATE OR REPLACE FUNCTION public.sync_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_post_comments_count ON public.social_post_comments;
CREATE TRIGGER trg_social_post_comments_count
  AFTER INSERT OR DELETE ON public.social_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_comments_count();

-- ----------------------------------------------------------------------------
-- 5. Study Groups, Members, Messages & Public Study Rooms
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT 'General',
  is_private boolean NOT NULL DEFAULT false,
  invite_code text UNIQUE NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8)),
  pinned_announcement text NOT NULL DEFAULT '',
  member_count integer NOT NULL DEFAULT 1,
  max_members integer NOT NULL DEFAULT 24,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_study_groups_updated_at ON public.study_groups;
CREATE TRIGGER trg_study_groups_updated_at
  BEFORE UPDATE ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.study_group_members (
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.study_group_members (user_id);

CREATE OR REPLACE FUNCTION public.sync_study_group_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.study_groups
      SET member_count = (SELECT count(*)::integer FROM public.study_group_members WHERE group_id = NEW.group_id)
      WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.study_groups
      SET member_count = (SELECT count(*)::integer FROM public.study_group_members WHERE group_id = OLD.group_id)
      WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_member_count ON public.study_group_members;
CREATE TRIGGER trg_group_member_count
  AFTER INSERT OR DELETE ON public.study_group_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_study_group_member_count();

CREATE TABLE IF NOT EXISTS public.study_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 600),
  message_type text NOT NULL DEFAULT 'chat' CHECK (message_type IN ('chat', 'announcement', 'focus_invite')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group ON public.study_group_messages (group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.study_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Silent Focus',
  max_capacity integer NOT NULL DEFAULT 12,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. Productivity, Economy, Achievements & Library Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.study_tasks (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL DEFAULT 'General',
  priority text NOT NULL DEFAULT 'medium',
  due_date text NOT NULL DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  kanban_status text NOT NULL DEFAULT 'todo',
  note_color text NOT NULL DEFAULT 'butter',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_tasks_user ON public.study_tasks (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.study_goals (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  scope text NOT NULL DEFAULT 'daily',
  target_minutes integer NOT NULL DEFAULT 90,
  subject text NOT NULL DEFAULT 'All Subjects',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_notes (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder text NOT NULL DEFAULT 'diary',
  is_diary boolean NOT NULL DEFAULT true,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_notes_user ON public.study_notes (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.saved_resources (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Saved',
  summary text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'focus',
  scope text NOT NULL DEFAULT 'personal',
  subject text NOT NULL DEFAULT 'General Study',
  target_seconds integer NOT NULL DEFAULT 1500,
  verified_seconds integer NOT NULL DEFAULT 0,
  credits_awarded integer NOT NULL DEFAULT 0,
  is_manual boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON public.focus_sessions (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.study_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL DEFAULT '',
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_sc_tx_user ON public.study_credit_transactions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_inventory (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.user_equipped_items (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot text NOT NULL,
  item_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  reward_credits integer NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.library_resources (
  id text PRIMARY KEY,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Study Guide',
  summary text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT 'Student',
  audience text NOT NULL DEFAULT 'public' CHECK (audience IN ('private', 'friends', 'public')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. Security & Privacy Helper Functions (After Tables Exist)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.are_friends(u1 uuid, u2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN u1 IS NULL OR u2 IS NULL OR u1 = u2 THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.friendships
      WHERE user_a = least(u1, u2) AND user_b = greatest(u1, u2)
    )
  END;
$$;

-- Enforces strict separation between viewing a profile (always allowed for signed-in users)
-- and viewing a user's study room (controlled by owner's privacy.roomVisibility: public | friends | private)
CREATE OR REPLACE FUNCTION public.can_view_user_room(target_uid uuid, viewer_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  priv jsonb;
  vis text;
BEGIN
  IF viewer_uid IS NULL OR target_uid IS NULL THEN
    RETURN false;
  END IF;
  IF viewer_uid = target_uid THEN
    RETURN true;
  END IF;

  SELECT privacy INTO priv FROM public.profiles WHERE id = target_uid;
  IF priv IS NULL THEN
    RETURN false;
  END IF;

  vis := coalesce(
    priv->>'roomVisibility',
    CASE
      WHEN (priv->>'allowRoomVisits')::boolean = false THEN 'private'
      ELSE 'friends'
    END
  );

  IF vis = 'public' THEN
    RETURN true;
  ELSIF vis = 'friends' THEN
    RETURN public.are_friends(target_uid, viewer_uid);
  ELSE
    RETURN false;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(gid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN gid IS NULL OR uid IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.study_group_members
      WHERE group_id = gid AND user_id = uid
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_group_role(gid uuid, uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.study_group_members
  WHERE group_id = gid AND user_id = uid
  LIMIT 1;
$$;

-- ----------------------------------------------------------------------------
-- 8. Signup Bootstrap Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := coalesce(
    nullif(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    nullif(split_part(coalesce(NEW.email, ''), '@', 1), ''),
    'Student'
  );

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, left(v_name, 32))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id, local_display_name)
  VALUES (NEW.id, left(v_name, 32))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_inventory (user_id, item_id)
  VALUES
    (NEW.id, 'theme_comic'),
    (NEW.id, 'music_rainy_vinyl'),
    (NEW.id, 'ambience_golden_hour'),
    (NEW.id, 'deco_penstand_classic'),
    (NEW.id, 'deco_penstand_mint'),
    (NEW.id, 'deco_charm_terrarium')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.study_credit_transactions (user_id, amount, reason, idempotency_key)
  VALUES (NEW.id, 50, 'Welcome Study Credits', 'welcome_' || NEW.id::text)
  ON CONFLICT (user_id, idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 9. Enable Row-Level Security & Policies
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_equipped_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can discover/view other students' profiles
DROP POLICY IF EXISTS profiles_select_auth ON public.profiles;
CREATE POLICY profiles_select_auth ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User Roles & Entitlements
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS user_entitlements_select_own ON public.user_entitlements;
CREATE POLICY user_entitlements_select_own ON public.user_entitlements
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Room Settings & Layouts: Strictly gated by roomVisibility (public / friends / private)
DROP POLICY IF EXISTS user_settings_select_room_scope ON public.user_settings;
CREATE POLICY user_settings_select_room_scope ON public.user_settings
  FOR SELECT USING (public.can_view_user_room(user_id, auth.uid()));

DROP POLICY IF EXISTS user_settings_write_own ON public.user_settings;
CREATE POLICY user_settings_write_own ON public.user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS room_layouts_select_room_scope ON public.room_layouts;
CREATE POLICY room_layouts_select_room_scope ON public.room_layouts
  FOR SELECT USING (public.can_view_user_room(user_id, auth.uid()));

DROP POLICY IF EXISTS room_layouts_write_own ON public.room_layouts;
CREATE POLICY room_layouts_write_own ON public.room_layouts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Friend Requests & Friendships
DROP POLICY IF EXISTS friend_requests_select_involved ON public.friend_requests;
CREATE POLICY friend_requests_select_involved ON public.friend_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS friend_requests_insert_sender ON public.friend_requests;
CREATE POLICY friend_requests_insert_sender ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND sender_id <> receiver_id AND status = 'pending');

DROP POLICY IF EXISTS friend_requests_update_involved ON public.friend_requests;
CREATE POLICY friend_requests_update_involved ON public.friend_requests
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS friend_requests_delete_involved ON public.friend_requests;
CREATE POLICY friend_requests_delete_involved ON public.friend_requests
  FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS friendships_select_involved ON public.friendships;
CREATE POLICY friendships_select_involved ON public.friendships
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS friendships_delete_involved ON public.friendships;
CREATE POLICY friendships_delete_involved ON public.friendships
  FOR DELETE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Notifications
DROP POLICY IF EXISTS notifications_own ON public.notifications;
CREATE POLICY notifications_own ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_insert_auth ON public.notifications;
CREATE POLICY notifications_insert_auth ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND (actor_id IS NULL OR actor_id = auth.uid()));

-- Social Feed
DROP POLICY IF EXISTS social_posts_select_visible ON public.social_posts;
CREATE POLICY social_posts_select_visible ON public.social_posts
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      author_id = auth.uid()
      OR visibility = 'public'
      OR (visibility = 'friends' AND public.are_friends(author_id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS social_posts_insert_own ON public.social_posts;
CREATE POLICY social_posts_insert_own ON public.social_posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS social_posts_update_own ON public.social_posts;
CREATE POLICY social_posts_update_own ON public.social_posts
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS social_posts_delete_own ON public.social_posts;
CREATE POLICY social_posts_delete_own ON public.social_posts
  FOR DELETE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS social_likes_select_auth ON public.social_post_likes;
CREATE POLICY social_likes_select_auth ON public.social_post_likes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS social_likes_write_own ON public.social_post_likes;
CREATE POLICY social_likes_write_own ON public.social_post_likes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS social_comments_select_auth ON public.social_post_comments;
CREATE POLICY social_comments_select_auth ON public.social_post_comments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS social_comments_insert_own ON public.social_post_comments;
CREATE POLICY social_comments_insert_own ON public.social_post_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS social_comments_delete_own ON public.social_post_comments;
CREATE POLICY social_comments_delete_own ON public.social_post_comments
  FOR DELETE USING (auth.uid() = author_id);

-- Study Groups & Rooms
DROP POLICY IF EXISTS study_groups_select_visible ON public.study_groups;
CREATE POLICY study_groups_select_visible ON public.study_groups
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      NOT is_private
      OR owner_id = auth.uid()
      OR public.is_group_member(id, auth.uid())
    )
  );

DROP POLICY IF EXISTS study_groups_insert_owner ON public.study_groups;
CREATE POLICY study_groups_insert_owner ON public.study_groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS study_groups_update_mod ON public.study_groups;
CREATE POLICY study_groups_update_mod ON public.study_groups
  FOR UPDATE USING (
    auth.uid() = owner_id OR public.get_group_role(id, auth.uid()) IN ('owner', 'moderator')
  );

DROP POLICY IF EXISTS study_groups_delete_owner ON public.study_groups;
CREATE POLICY study_groups_delete_owner ON public.study_groups
  FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS group_members_select_visible ON public.study_group_members;
CREATE POLICY group_members_select_visible ON public.study_group_members
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      public.is_group_member(group_id, auth.uid())
      OR EXISTS (SELECT 1 FROM public.study_groups g WHERE g.id = group_id AND NOT g.is_private)
    )
  );

DROP POLICY IF EXISTS group_members_insert_self ON public.study_group_members;
CREATE POLICY group_members_insert_self ON public.study_group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS group_members_delete_self_or_mod ON public.study_group_members;
CREATE POLICY group_members_delete_self_or_mod ON public.study_group_members
  FOR DELETE USING (
    auth.uid() = user_id OR public.get_group_role(group_id, auth.uid()) IN ('owner', 'moderator')
  );

DROP POLICY IF EXISTS group_messages_select_member ON public.study_group_messages;
CREATE POLICY group_messages_select_member ON public.study_group_messages
  FOR SELECT USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS group_messages_insert_member ON public.study_group_messages;
CREATE POLICY group_messages_insert_member ON public.study_group_messages
  FOR INSERT WITH CHECK (auth.uid() = author_id AND public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS group_messages_delete_author_or_mod ON public.study_group_messages;
CREATE POLICY group_messages_delete_author_or_mod ON public.study_group_messages
  FOR DELETE USING (
    auth.uid() = author_id OR public.get_group_role(group_id, auth.uid()) IN ('owner', 'moderator')
  );

DROP POLICY IF EXISTS study_rooms_select_visible ON public.study_rooms;
CREATE POLICY study_rooms_select_visible ON public.study_rooms
  FOR SELECT USING (auth.role() = 'authenticated' AND (is_public OR host_id = auth.uid()));

DROP POLICY IF EXISTS study_rooms_write_host ON public.study_rooms;
CREATE POLICY study_rooms_write_host ON public.study_rooms
  FOR ALL USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

-- Private Owner-Only Productivity & Economy
DROP POLICY IF EXISTS study_tasks_own ON public.study_tasks;
CREATE POLICY study_tasks_own ON public.study_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS study_goals_own ON public.study_goals;
CREATE POLICY study_goals_own ON public.study_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS study_notes_own ON public.study_notes;
CREATE POLICY study_notes_own ON public.study_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS saved_resources_own ON public.saved_resources;
CREATE POLICY saved_resources_own ON public.saved_resources
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS focus_sessions_own ON public.focus_sessions;
CREATE POLICY focus_sessions_own ON public.focus_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS focus_sessions_friend_live ON public.focus_sessions;
CREATE POLICY focus_sessions_friend_live ON public.focus_sessions
  FOR SELECT USING (
    status = 'running'
    AND public.are_friends(user_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = focus_sessions.user_id
        AND coalesce((p.privacy->>'showStudyActivity')::boolean, true) = true
    )
  );

DROP POLICY IF EXISTS sc_tx_select_own ON public.study_credit_transactions;
CREATE POLICY sc_tx_select_own ON public.study_credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS inventory_select_own ON public.user_inventory;
CREATE POLICY inventory_select_own ON public.user_inventory
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS equipped_own ON public.user_equipped_items;
CREATE POLICY equipped_own ON public.user_equipped_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS achievements_select_all ON public.achievements;
CREATE POLICY achievements_select_all ON public.achievements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS user_achievements_own ON public.user_achievements;
CREATE POLICY user_achievements_own ON public.user_achievements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS library_select_audience ON public.library_resources;
CREATE POLICY library_select_audience ON public.library_resources
  FOR SELECT USING (
    audience = 'public'
    OR author_id = auth.uid()
    OR (audience = 'friends' AND public.are_friends(author_id, auth.uid()))
  );

DROP POLICY IF EXISTS library_write_own ON public.library_resources;
CREATE POLICY library_write_own ON public.library_resources
  FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS content_reports_insert_auth ON public.content_reports;
CREATE POLICY content_reports_insert_auth ON public.content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS content_reports_select_admin ON public.content_reports;
CREATE POLICY content_reports_select_admin ON public.content_reports
  FOR SELECT USING (public.is_admin(auth.uid()) OR auth.uid() = reporter_id);

DROP POLICY IF EXISTS admin_audit_logs_admin ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_admin ON public.admin_audit_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 10. Server-Authoritative RPC Functions
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accept_friend_request(
  p_request_id uuid,
  p_accept boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.friend_requests%ROWTYPE;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_req
  FROM public.friend_requests
  WHERE id = p_request_id AND receiver_id = v_uid AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already handled';
  END IF;

  IF p_accept THEN
    UPDATE public.friend_requests SET status = 'accepted' WHERE id = p_request_id;
    INSERT INTO public.friendships (user_a, user_b)
    VALUES (least(v_req.sender_id, v_req.receiver_id), greatest(v_req.sender_id, v_req.receiver_id))
    ON CONFLICT (user_a, user_b) DO NOTHING;

    SELECT display_name INTO v_name FROM public.profiles WHERE id = v_uid;
    INSERT INTO public.notifications (user_id, actor_id, type, title, body)
    VALUES (
      v_req.sender_id,
      v_uid,
      'friend_accepted',
      'Friend Request Accepted',
      coalesce(v_name, 'A student') || ' accepted your friend request.'
    );
  ELSE
    UPDATE public.friend_requests SET status = 'declined' WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'accepted', p_accept);
END;
$$;

CREATE OR REPLACE FUNCTION public.unfriend_user(p_friend_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.friendships
  WHERE user_a = least(v_uid, p_friend_id)
    AND user_b = greatest(v_uid, p_friend_id);

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_study_group(
  p_name text,
  p_description text DEFAULT '',
  p_subject text DEFAULT 'General',
  p_is_private boolean DEFAULT false
)
RETURNS public.study_groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_group public.study_groups;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF char_length(btrim(coalesce(p_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Group name must be at least 2 characters';
  END IF;

  INSERT INTO public.study_groups (owner_id, name, description, subject, is_private)
  VALUES (
    v_uid,
    left(btrim(p_name), 60),
    left(btrim(coalesce(p_description, '')), 260),
    left(coalesce(nullif(btrim(p_subject), ''), 'General'), 48),
    coalesce(p_is_private, false)
  )
  RETURNING * INTO v_group;

  INSERT INTO public.study_group_members (group_id, user_id, role)
  VALUES (v_group.id, v_uid, 'owner')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  INSERT INTO public.study_group_messages (group_id, author_id, content, message_type)
  VALUES (v_group.id, v_uid, 'Created the study group "' || v_group.name || '".', 'announcement');

  RETURN v_group;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_study_group(
  p_group_id uuid DEFAULT NULL,
  p_invite_code text DEFAULT NULL
)
RETURNS public.study_groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_group public.study_groups;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_invite_code IS NOT NULL AND btrim(p_invite_code) <> '' THEN
    SELECT * INTO v_group
    FROM public.study_groups
    WHERE upper(invite_code) = upper(btrim(p_invite_code))
    LIMIT 1;
  ELSIF p_group_id IS NOT NULL THEN
    SELECT * INTO v_group
    FROM public.study_groups
    WHERE id = p_group_id
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Study group not found';
  END IF;

  IF v_group.is_private AND (p_invite_code IS NULL OR upper(v_group.invite_code) <> upper(btrim(p_invite_code))) THEN
    IF NOT public.is_group_member(v_group.id, v_uid) THEN
      RAISE EXCEPTION 'This study group is private. Enter a valid invite code to join.';
    END IF;
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM public.study_group_members
  WHERE group_id = v_group.id;

  IF v_count >= coalesce(v_group.max_members, 24) AND NOT public.is_group_member(v_group.id, v_uid) THEN
    RAISE EXCEPTION 'This study group has reached its member limit';
  END IF;

  INSERT INTO public.study_group_members (group_id, user_id, role)
  VALUES (v_group.id, v_uid, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  SELECT * INTO v_group FROM public.study_groups WHERE id = v_group.id;
  RETURN v_group;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_study_group(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_remaining integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role INTO v_role
  FROM public.study_group_members
  WHERE group_id = p_group_id AND user_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  SELECT count(*)::integer INTO v_remaining
  FROM public.study_group_members
  WHERE group_id = p_group_id AND user_id <> v_uid;

  IF v_role = 'owner' AND v_remaining = 0 THEN
    DELETE FROM public.study_groups WHERE id = p_group_id;
    RETURN jsonb_build_object('ok', true, 'deleted', true);
  ELSIF v_role = 'owner' THEN
    RAISE EXCEPTION 'Transfer ownership or remove members before leaving as owner';
  END IF;

  DELETE FROM public.study_group_members
  WHERE group_id = p_group_id AND user_id = v_uid;

  RETURN jsonb_build_object('ok', true, 'deleted', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_catalog_item(
  p_item_id text,
  p_idempotency_key text,
  p_price integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_price integer := greatest(0, coalesce(p_price, 0));
  v_balance integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_inventory WHERE user_id = v_uid AND item_id = p_item_id) THEN
    SELECT coalesce(sum(amount), 0)::integer INTO v_balance
    FROM public.study_credit_transactions WHERE user_id = v_uid;
    RETURN jsonb_build_object('ok', true, 'balance', greatest(0, v_balance), 'alreadyOwned', true);
  END IF;

  SELECT coalesce(sum(amount), 0)::integer INTO v_balance
  FROM public.study_credit_transactions WHERE user_id = v_uid;

  IF v_balance < v_price THEN
    RAISE EXCEPTION 'Not enough Study Credits (% SC needed, % SC available)', v_price, v_balance;
  END IF;

  IF v_price > 0 THEN
    INSERT INTO public.study_credit_transactions (user_id, amount, reason, idempotency_key)
    VALUES (v_uid, -v_price, 'Purchased ' || p_item_id, p_idempotency_key)
    ON CONFLICT (user_id, idempotency_key) DO NOTHING;
  END IF;

  INSERT INTO public.user_inventory (user_id, item_id)
  VALUES (v_uid, p_item_id)
  ON CONFLICT (user_id, item_id) DO NOTHING;

  SELECT coalesce(sum(amount), 0)::integer INTO v_balance
  FROM public.study_credit_transactions WHERE user_id = v_uid;

  RETURN jsonb_build_object('ok', true, 'balance', greatest(0, v_balance));
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_focus_session(
  p_session_id text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sess public.focus_sessions%ROWTYPE;
  v_elapsed integer;
  v_award integer := 0;
  v_today_earned integer := 0;
  v_balance integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_sess
  FROM public.focus_sessions
  WHERE id = p_session_id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Focus session not found';
  END IF;

  v_elapsed := greatest(0, extract(epoch FROM (now() - v_sess.started_at))::integer);
  IF v_sess.target_seconds > 0 THEN
    v_elapsed := least(v_elapsed, v_sess.target_seconds);
  END IF;

  IF v_sess.mode = 'focus' AND v_elapsed >= 300 AND v_sess.status <> 'completed' THEN
    SELECT coalesce(sum(amount), 0)::integer INTO v_today_earned
    FROM public.study_credit_transactions
    WHERE user_id = v_uid
      AND amount > 0
      AND created_at >= date_trunc('day', now());

    v_award := least(120 - least(120, v_today_earned), greatest(0, (v_elapsed / 1500) * 10));
    IF v_award > 0 THEN
      INSERT INTO public.study_credit_transactions (user_id, amount, reason, idempotency_key)
      VALUES (v_uid, v_award, 'Focus Session: ' || coalesce(v_sess.subject, 'Study'), p_idempotency_key)
      ON CONFLICT (user_id, idempotency_key) DO NOTHING;
    END IF;
  END IF;

  UPDATE public.focus_sessions
  SET status = 'completed',
      verified_seconds = greatest(verified_seconds, v_elapsed),
      credits_awarded = greatest(credits_awarded, v_award),
      completed_at = now()
  WHERE id = p_session_id;

  SELECT coalesce(sum(amount), 0)::integer INTO v_balance
  FROM public.study_credit_transactions WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'credits_awarded', v_award,
    'balance', greatest(0, v_balance)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_entitlement(
  p_target_user_id uuid,
  p_entitlement text DEFAULT 'premium',
  p_reason text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'Administrator role required';
  END IF;

  INSERT INTO public.user_entitlements (user_id, entitlement, status, granted_by, reason)
  VALUES (p_target_user_id, p_entitlement, 'active', v_uid, coalesce(p_reason, ''))
  ON CONFLICT (user_id, entitlement)
  DO UPDATE SET status = 'active', granted_by = v_uid, reason = excluded.reason;

  INSERT INTO public.admin_audit_logs (admin_id, action, target_user_id, reason)
  VALUES (v_uid, 'grant_' || p_entitlement, p_target_user_id, coalesce(p_reason, ''));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. Seed Starter Achievements
-- ----------------------------------------------------------------------------

INSERT INTO public.achievements (id, title, description, reward_credits) VALUES
  ('first_focus', 'First Focus Block', 'Complete your first verified 25m focus session.', 15),
  ('five_hours', 'Deep Worker', 'Log 5 total hours of focused study.', 30),
  ('streak_7', '7-Day Habit', 'Maintain a 7-day study streak.', 40),
  ('social_circle', 'Study Buddy', 'Connect with your first study friend.', 15)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 12. Storage Buckets & Policies
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('group-assets', 'group-assets', true),
  ('learning-resources', 'learning-resources', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS storage_public_read ON storage.objects;
CREATE POLICY storage_public_read ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars', 'group-assets', 'learning-resources'));

DROP POLICY IF EXISTS storage_avatars_write_own ON storage.objects;
CREATE POLICY storage_avatars_write_own ON storage.objects
  FOR ALL USING (
    bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS storage_group_assets_write_auth ON storage.objects;
CREATE POLICY storage_group_assets_write_auth ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('group-assets', 'learning-resources') AND auth.role() = 'authenticated'
  );

-- ----------------------------------------------------------------------------
-- 13. Grants & PostgREST Schema Reload
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.achievements TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

NOTIFY pgrst, 'reload schema';
