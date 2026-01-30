-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline', -- offline, online, in-game
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Enable RLS on friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Friendships policies
CREATE POLICY "Users can view their friendships" 
ON public.friendships FOR SELECT 
USING (
  requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR addressee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create friend requests" 
ON public.friendships FOR INSERT 
WITH CHECK (requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update friendships they're part of" 
ON public.friendships FOR UPDATE 
USING (
  requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR addressee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete their friendships" 
ON public.friendships FOR DELETE 
USING (
  requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR addressee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Create game invites table
CREATE TABLE public.game_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  party_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, expired
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Enable RLS on game_invites
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;

-- Game invites policies
CREATE POLICY "Users can view their invites" 
ON public.game_invites FOR SELECT 
USING (
  from_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR to_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create invites" 
ON public.game_invites FOR INSERT 
WITH CHECK (from_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update invites they received" 
ON public.game_invites FOR UPDATE 
USING (to_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their invites" 
ON public.game_invites FOR DELETE 
USING (
  from_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR to_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Update game_parties for battle royale (up to 5 players)
ALTER TABLE public.game_parties 
ADD COLUMN max_players INT DEFAULT 2,
ADD COLUMN current_players INT DEFAULT 1,
ADD COLUMN player_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN player_positions JSONB DEFAULT '[]'::JSONB,
ADD COLUMN eliminated_players TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invites;

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();