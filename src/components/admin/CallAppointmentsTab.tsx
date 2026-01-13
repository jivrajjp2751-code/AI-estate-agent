import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  Languages,
} from "lucide-react";
import { format } from "date-fns";

interface CallAppointment {
  id: string;
  inquiry_id: string | null;
  customer_name: string;
  customer_phone: string;
  appointment_date: string | null;
  appointment_time: string | null;
  property_location: string | null;
  notes: string | null;
  call_id: string | null;
  language: string | null;
  status: string | null;
  created_at: string;
}

const CallAppointmentsTab = () => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<CallAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();

    // Set up realtime subscription
    const channel = supabase
      .channel("call-appointments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_appointments" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAppointments((prev) => [payload.new as CallAppointment, ...prev]);
            toast({
              title: "New Appointment Scheduled!",
              description: `${(payload.new as CallAppointment).customer_name} - ${(payload.new as CallAppointment).appointment_date || "Date TBD"}`,
            });
          } else if (payload.eventType === "UPDATE") {
            setAppointments((prev) =>
              prev.map((a) =>
                a.id === payload.new.id ? (payload.new as CallAppointment) : a
              )
            );
          } else if (payload.eventType === "DELETE") {
            setAppointments((prev) =>
              prev.filter((a) => a.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("call_appointments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching appointments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("call_appointments")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );

      toast({
        title: "Status Updated",
        description: `Appointment marked as ${status}`,
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("call_appointments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAppointments((prev) => prev.filter((a) => a.id !== id));
      toast({
        title: "Appointment Deleted",
        description: "Record removed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-500">Scheduled</Badge>;
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "completed":
        return <Badge className="bg-primary">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "pending_confirmation":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status || "Unknown"}</Badge>;
    }
  };

  const getLanguageBadge = (language: string | null) => {
    const langMap: Record<string, { label: string; className: string }> = {
      hindi: { label: "हिंदी", className: "bg-orange-500 text-white" },
      english: { label: "English", className: "bg-blue-500 text-white" },
      marathi: { label: "मराठी", className: "bg-green-600 text-white" },
    };
    const lang = langMap[language || "hindi"] || langMap.hindi;
    return <Badge className={lang.className}>{lang.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="glass-card p-6">
          <p className="text-muted-foreground text-sm">Total Appointments</p>
          <p className="text-3xl font-bold gradient-text">{appointments.length}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-muted-foreground text-sm">Scheduled</p>
          <p className="text-3xl font-bold text-blue-500">
            {appointments.filter((a) => a.status === "scheduled").length}
          </p>
        </div>
        <div className="glass-card p-6">
          <p className="text-muted-foreground text-sm">Confirmed</p>
          <p className="text-3xl font-bold text-green-500">
            {appointments.filter((a) => a.status === "confirmed").length}
          </p>
        </div>
        <div className="glass-card p-6">
          <p className="text-muted-foreground text-sm">Today's Visits</p>
          <p className="text-3xl font-bold gradient-text">
            {
              appointments.filter((a) => {
                if (!a.appointment_date) return false;
                const today = format(new Date(), "yyyy-MM-dd");
                return a.appointment_date.includes(today);
              }).length
            }
          </p>
        </div>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 flex items-center justify-between"
      >
        <h2 className="text-lg font-semibold">Call-Scheduled Appointments</h2>
        <Button variant="outline" onClick={fetchAppointments} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No call-scheduled appointments yet. Appointments booked via AI calls will appear here.
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-primary" />
                          {appointment.customer_name}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {appointment.customer_phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {appointment.appointment_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3 text-primary" />
                            {appointment.appointment_date}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Date TBD</span>
                        )}
                        {appointment.appointment_time && (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3 text-primary" />
                            {appointment.appointment_time}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {appointment.property_location ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-primary" />
                          {appointment.property_location}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Languages className="w-3 h-3 text-muted-foreground" />
                        {getLanguageBadge(appointment.language)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {appointment.notes || "-"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(appointment.created_at), "dd MMM, HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateStatus(appointment.id, "confirmed")}
                          className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          title="Mark as Confirmed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateStatus(appointment.id, "cancelled")}
                          className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                          title="Mark as Cancelled"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(appointment.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
};

export default CallAppointmentsTab;
