import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RefreshCw, Users, Shield, UserCog, Eye, Mail, UserPlus, Trash2 } from "lucide-react";
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
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [isInviting, setIsInviting] = useState(false);

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

  const handleRemoveAccess = async (profileId: string, userId: string, email: string | null) => {
    if (userId === currentUserId) {
      toast({
        title: "Cannot remove your own access",
        description: "You cannot remove your own access. Ask another admin.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingId(profileId);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", profileId);

      if (error) throw error;

      setProfiles((prev) => prev.filter((p) => p.id !== profileId));

      toast({
        title: "Access removed",
        description: `${email || "User"}'s admin access has been revoked`,
      });
    } catch (error: any) {
      toast({
        title: "Error removing access",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleInviteUser = async () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-grant-role-by-email",
        {
          body: {
            email: normalizedEmail,
            role: inviteRole,
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Failed to grant access");
      }

      const profile = (data as any)?.profile as Profile | undefined;

      toast({
        title: "Access granted",
        description: `${profile?.email ?? normalizedEmail} is now ${inviteRole}`,
      });

      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteRole("editor");

      // Refresh to reflect new/updated profile
      await fetchProfiles();
    } catch (error: any) {
      const message =
        error?.message || "Could not grant access. Please try again.";

      toast({
        title: "Grant access failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          User Role Management
        </h2>
        <div className="flex items-center gap-2">
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Grant Access by Email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant Admin Dashboard Access</DialogTitle>
                <DialogDescription>
                  Enter the email of a registered user to grant them access to the admin dashboard.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role to Assign</label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-destructive" />
                          Admin - Full access
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <UserCog className="w-4 h-4 text-primary" />
                          Editor - Manage content
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          Viewer - Read only
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInviteUser} disabled={isInviting}>
                  {isInviting ? "Granting..." : "Grant Access"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={fetchProfiles} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
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
                  <TableHead>Actions</TableHead>
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveAccess(profile.id, profile.user_id, profile.email)}
                        disabled={updatingId === profile.id || profile.user_id === currentUserId}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
