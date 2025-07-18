-- Add missing foreign key relationships for user_organizations table
ALTER TABLE user_organizations 
ADD CONSTRAINT user_organizations_admin_user_id_fkey 
FOREIGN KEY (admin_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE user_organizations 
ADD CONSTRAINT user_organizations_managed_user_id_fkey 
FOREIGN KEY (managed_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Ensure zoom_connections has proper foreign key to profiles
ALTER TABLE zoom_connections 
DROP CONSTRAINT IF EXISTS zoom_connections_user_id_fkey;

ALTER TABLE zoom_connections 
ADD CONSTRAINT zoom_connections_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;