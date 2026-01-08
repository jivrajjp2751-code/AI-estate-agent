import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, History, UserCog, Trash2, UserPlus, Users } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface AuditLog {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_email: string | null;
  details: Record<string, unknown> | null;
  performed_by: string;
  performed_by_email: string | null;
  created_at: string;
}

const AuditLogViewer = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching audit logs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "role_change":
      case "bulk_role_change":
        return <UserCog className="w-4 h-4 text-primary" />;
      case "access_removed":
      case "bulk_access_removed":
        return <Trash2 className="w-4 h-4 text-destructive" />;
      case "access_granted":
        return <UserPlus className="w-4 h-4 text-green-500" />;
      default:
        return <History className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      role_change: "default",
      bulk_role_change: "default",
      access_removed: "destructive",
      bulk_access_removed: "destructive",
      access_granted: "secondary",
    };

    const labels: Record<string, string> = {
      role_change: "Role Changed",
      bulk_role_change: "Bulk Role Change",
      access_removed: "Access Removed",
      bulk_access_removed: "Bulk Access Removed",
      access_granted: "Access Granted",
    };

    return (
      <Badge variant={variants[action] || "outline"}>
        {labels[action] || action}
      </Badge>
    );
  };

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details) return null;
    
    const parts: string[] = [];
    
    if (details.old_role && details.new_role) {
      parts.push(`${details.old_role} → ${details.new_role}`);
    }
    
    if (details.role) {
      parts.push(`Role: ${details.role}`);
    }
    
    if (details.previous_role) {
      parts.push(`Was: ${details.previous_role}`);
    }
    
    if (details.count) {
      parts.push(`${details.count} users`);
    }
    
    if (details.new_role && !details.old_role) {
      parts.push(`New role: ${details.new_role}`);
    }

    return parts.length > 0 ? parts.join(" • ") : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <History className="w-5 h-5" />
          Audit Logs
        </h2>
        <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getActionIcon(log.action)}</TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div>
                        {log.target_email && (
                          <p className="font-medium">{log.target_email}</p>
                        )}
                        {log.target_type === "users" && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Multiple users
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDetails(log.details)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{log.performed_by_email}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewer;
