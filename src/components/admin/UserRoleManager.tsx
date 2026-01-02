import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Users, Shield, UserCog, Eye, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  role: "admin" | "editor" | "viewer";
  created_at: string;
}

interface UserRoleManagerProps {
  currentUserId: string | undefined;
}

const UserRoleManager = ({ currentUserId }: UserRoleManagerProps) => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleRoleChange = async (profileId: string, userId: string, newRole: string) => {
    // Prevent changing own role
    if (userId === currentUserId) {
      toast({
        title: "Cannot change your own role",
        description: "You cannot modify your own role. Ask another admin.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingId(profileId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole as "admin" | "editor" | "viewer" })
        .eq("id", profileId);

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, role: newRole as "admin" | "editor" | "viewer" } : p
        )
      );

      toast({
        title: "Role updated",
        description: `User role changed to ${newRole}`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4 text-destructive" />;
      case "editor":
        return <UserCog className="w-4 h-4 text-primary" />;
      default:
        return <Eye className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-destructive/10 text-destructive";
      case "editor":
        return "bg-primary/10 text-primary";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          User Role Management
        </h2>
        <Button variant="outline" onClick={fetchProfiles} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 mb-4"
      >
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Role Permissions</p>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              <li><strong>Admin:</strong> Full access - manage properties, photos, inquiries, and user roles</li>
              <li><strong>Editor:</strong> Can manage properties, photos, and view inquiries</li>
              <li><strong>Viewer:</strong> No admin dashboard access</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : profiles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center"
        >
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No users found</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Change Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                          {profile.email || "No email"}
                        </span>
                        {profile.user_id === currentUserId && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                            You
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadgeClass(
                          profile.role
                        )}`}
                      >
                        {getRoleIcon(profile.role)}
                        {profile.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={profile.role}
                        onValueChange={(value) =>
                          handleRoleChange(profile.id, profile.user_id, value)
                        }
                        disabled={
                          updatingId === profile.id ||
                          profile.user_id === currentUserId
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(profile.created_at), "dd MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default UserRoleManager;
