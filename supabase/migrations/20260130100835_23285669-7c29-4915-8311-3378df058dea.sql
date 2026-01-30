-- Create parties table for multiplayer games
CREATE TABLE public.game_parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_code TEXT NOT NULL UNIQUE,
  host_id TEXT NOT NULL,
  guest_id TEXT,
  host_paddle_y FLOAT DEFAULT 50,
  guest_paddle_y FLOAT DEFAULT 50,
  ball_x FLOAT DEFAULT 50,
  ball_y FLOAT DEFAULT 50,
  ball_dx FLOAT DEFAULT 4,
  ball_dy FLOAT DEFAULT 4,
  host_score INT DEFAULT 0,
  guest_score INT DEFAULT 0,
  game_status TEXT DEFAULT 'waiting', -- waiting, playing, paused, finished
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.game_parties ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to view parties (needed for joining)
CREATE POLICY "Anyone can view parties" 
ON public.game_parties 
FOR SELECT 
USING (true);

-- Create policy to allow anyone to create parties
CREATE POLICY "Anyone can create parties" 
ON public.game_parties 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow anyone to update parties (for game state sync)
CREATE POLICY "Anyone can update parties" 
ON public.game_parties 
FOR UPDATE 
USING (true);

-- Create policy to allow anyone to delete parties
CREATE POLICY "Anyone can delete parties" 
ON public.game_parties 
FOR DELETE 
USING (true);

-- Enable realtime for game_parties table
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_parties;