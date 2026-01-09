import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useAdminNotify } from "@/hooks/useAdminNotify";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const { logAction } = useAuditLog();
  const { sendNotification } = useAdminNotify();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [isInviting, setIsInviting] = useState(false);

  // Confirmation dialog state
  const [confirmRemove, setConfirmRemove] = useState<{ profileId: string; userId: string; email: string | null } | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"remove" | "role" | null>(null);

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

    const profile = profiles.find((p) => p.id === profileId);
    const oldRole = profile?.role;

    setUpdatingId(profileId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole as "admin" | "editor" | "viewer" })
        .eq("id", profileId);

      if (error) throw error;

      // Log the role change
      await logAction({
        action: "role_change",
        target_type: "user",
        target_id: userId,
        target_email: profile?.email || undefined,
        details: { old_role: oldRole, new_role: newRole },
      });

      // Send email notification
      sendNotification({
        action: "role_change",
        targetEmail: profile?.email || undefined,
        details: { old_role: oldRole, new_role: newRole },
      });

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

  const confirmAndRemoveAccess = async () => {
    if (!confirmRemove) return;
    const { profileId, userId, email } = confirmRemove;
    const profile = profiles.find((p) => p.id === profileId);

    setUpdatingId(profileId);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", profileId);

      if (error) throw error;

      // Log the access removal
      await logAction({
        action: "access_removed",
        target_type: "user",
        target_id: userId,
        target_email: email || undefined,
        details: { previous_role: profile?.role },
      });

      // Send email notification
      sendNotification({
        action: "access_removed",
        targetEmail: email || undefined,
        details: { previous_role: profile?.role },
      });

      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });

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
      setConfirmRemove(null);
    }
  };

  const handleRemoveClick = (profileId: string, userId: string, email: string | null) => {
    if (userId === currentUserId) {
      toast({
        title: "Cannot remove your own access",
        description: "You cannot remove your own access. Ask another admin.",
        variant: "destructive",
      });
      return;
    }
    setConfirmRemove({ profileId, userId, email });
  };

  // Bulk selection helpers
  const selectableProfiles = profiles.filter((p) => p.user_id !== currentUserId);
  const allSelected = selectableProfiles.length > 0 && selectableProfiles.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableProfiles.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkRemove = async () => {
    const idsToRemove = Array.from(selectedIds);
    if (idsToRemove.length === 0) return;

    const removedProfiles = profiles.filter((p) => selectedIds.has(p.id));

    setUpdatingId("bulk");
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .in("id", idsToRemove);

      if (error) throw error;

      // Log bulk access removal
      await logAction({
        action: "bulk_access_removed",
        target_type: "users",
        details: { 
          count: idsToRemove.length,
          emails: removedProfiles.map((p) => p.email).filter(Boolean),
        },
      });

      // Send email notification
      sendNotification({
        action: "bulk_access_removed",
        details: { 
          count: idsToRemove.length,
          emails: removedProfiles.map((p) => p.email).filter(Boolean),
        },
      });

      setProfiles((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());

      toast({
        title: "Access removed",
        description: `${idsToRemove.length} user(s) access has been revoked`,
      });
    } catch (error: any) {
      toast({
        title: "Error removing access",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
      setIsBulkConfirmOpen(false);
      setBulkAction(null);
    }
  };

  const handleBulkRoleChange = async () => {
    const idsToUpdate = Array.from(selectedIds);
    if (idsToUpdate.length === 0) return;

    const updatedProfiles = profiles.filter((p) => selectedIds.has(p.id));

    setUpdatingId("bulk");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: bulkRole })
        .in("id", idsToUpdate);

      if (error) throw error;

      // Log bulk role change
      await logAction({
        action: "bulk_role_change",
        target_type: "users",
        details: { 
          count: idsToUpdate.length,
          new_role: bulkRole,
          emails: updatedProfiles.map((p) => p.email).filter(Boolean),
        },
      });

      // Send email notification
      sendNotification({
        action: "bulk_role_change",
        details: { 
          count: idsToUpdate.length,
          new_role: bulkRole,
          emails: updatedProfiles.map((p) => p.email).filter(Boolean),
        },
      });

      setProfiles((prev) =>
        prev.map((p) => (selectedIds.has(p.id) ? { ...p, role: bulkRole } : p))
      );
      setSelectedIds(new Set());

      toast({
        title: "Roles updated",
        description: `${idsToUpdate.length} user(s) role changed to ${bulkRole}`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating roles",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
      setIsBulkConfirmOpen(false);
      setBulkAction(null);
    }
  };

  const executeBulkAction = () => {
    if (bulkAction === "remove") {
      handleBulkRemove();
    } else if (bulkAction === "role") {
      handleBulkRoleChange();
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

      // Log access granted
      await logAction({
        action: "access_granted",
        target_type: "user",
        target_id: profile?.user_id,
        target_email: normalizedEmail,
        details: { role: inviteRole },
      });

      // Send email notification
      sendNotification({
        action: "access_granted",
        targetEmail: normalizedEmail,
        details: { role: inviteRole },
      });

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
      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove access for <strong>{confirmRemove?.email || "this user"}</strong>? 
              They will no longer be able to access the admin dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAndRemoveAccess}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={isBulkConfirmOpen} onOpenChange={setIsBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "remove" ? "Remove Access for Multiple Users" : "Change Role for Multiple Users"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "remove" 
                ? `Are you sure you want to remove access for ${selectedIds.size} user(s)? They will no longer be able to access the admin dashboard.`
                : `Are you sure you want to change the role to "${bulkRole}" for ${selectedIds.size} user(s)?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkAction}
              className={bulkAction === "remove" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {bulkAction === "remove" ? "Remove All" : "Change Roles"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 flex items-center justify-between flex-wrap gap-3"
        >
          <span className="text-sm font-medium">{selectedIds.size} user(s) selected</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkAction("role");
                  setIsBulkConfirmOpen(true);
                }}
                disabled={updatingId === "bulk"}
              >
                Change Role
              </Button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setBulkAction("remove");
                setIsBulkConfirmOpen(true);
              }}
              disabled={updatingId === "bulk"}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remove Selected
            </Button>
          </div>
        </motion.div>
      )}

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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all users"
                    />
                  </TableHead>
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
                      <Checkbox
                        checked={selectedIds.has(profile.id)}
                        onCheckedChange={() => toggleSelect(profile.id)}
                        disabled={profile.user_id === currentUserId}
                        aria-label={`Select ${profile.email || "user"}`}
                      />
                    </TableCell>
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
                        onClick={() => handleRemoveClick(profile.id, profile.user_id, profile.email)}
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
