import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import PropertyPhotoManager from "@/components/admin/PropertyPhotoManager";
import {
  Building2,
  LogOut,
  Search,
  Filter,
  Download,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  Trash2,
  Users,
  ImageIcon,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { User, Session } from "@supabase/supabase-js";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferred_area: string | null;
  budget: string | null;
  preferred_time: string | null;
  appointment_date: string | null;
  message: string | null;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [budgetFilter, setBudgetFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("inquiries");

  const { role, isLoading: isRoleLoading, isAdminOrEditor } = useUserRole(user);

  const areas = [
    "all",
    "Mumbai - Bandra",
    "Mumbai - Worli",
    "Mumbai - Andheri",
    "Mumbai - Powai",
    "Pune - Koregaon Park",
    "Pune - Hinjewadi",
    "Pune - Kothrud",
    "Nashik",
    "Nagpur",
    "Lonavala",
    "Alibaug",
    "Panchgani",
  ];

  const budgets = [
    "all",
    "Under ₹50 Lakh",
    "₹50 Lakh - ₹1 Cr",
    "₹1 Cr - ₹3 Cr",
    "₹3 Cr - ₹5 Cr",
    "₹5 Cr - ₹10 Cr",
    "Above ₹10 Cr",
  ];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session && isAdminOrEditor) {
      fetchInquiries();
    }
  }, [session, isAdminOrEditor]);

  useEffect(() => {
    let result = inquiries;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (inq) =>
          inq.name.toLowerCase().includes(query) ||
          inq.email.toLowerCase().includes(query) ||
          inq.phone.includes(query)
      );
    }

    if (areaFilter !== "all") {
      result = result.filter((inq) => inq.preferred_area === areaFilter);
    }

    if (budgetFilter !== "all") {
      result = result.filter((inq) => inq.budget === budgetFilter);
    }

    setFilteredInquiries(result);
  }, [searchQuery, areaFilter, budgetFilter, inquiries]);

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("customer_inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching inquiries",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("customer_inquiries")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setInquiries((prev) => prev.filter((inq) => inq.id !== id));
      toast({ title: "Inquiry deleted", description: "Record removed successfully." });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Preferred Area",
      "Budget",
      "Preferred Time",
      "Appointment Date",
      "Message",
      "Submitted At",
    ];

    const rows = filteredInquiries.map((inq) => [
      inq.name,
      inq.email,
      inq.phone,
      inq.preferred_area || "",
      inq.budget || "",
      inq.preferred_time || "",
      inq.appointment_date || "",
      inq.message || "",
      format(new Date(inq.created_at), "dd/MM/yyyy HH:mm"),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inquiries_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Show loading state while checking role
  if (!user || isRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied if not admin or editor
  if (!isAdminOrEditor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="glass-card p-12 text-center max-w-md mx-4">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access the admin dashboard. Only administrators and editors can access this area.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              Go Home
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm">
                {user.email} • <span className="capitalize text-primary">{role}</span>
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="inquiries" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Inquiries
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Property Photos
            </TabsTrigger>
          </TabsList>

          {/* Inquiries Tab */}
          <TabsContent value="inquiries" className="space-y-6">
            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              <div className="glass-card p-6">
                <p className="text-muted-foreground text-sm">Total Inquiries</p>
                <p className="text-3xl font-bold gradient-text">{inquiries.length}</p>
              </div>
              <div className="glass-card p-6">
                <p className="text-muted-foreground text-sm">This Week</p>
                <p className="text-3xl font-bold gradient-text">
                  {
                    inquiries.filter(
                      (i) =>
                        new Date(i.created_at) >
                        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length
                  }
                </p>
              </div>
              <div className="glass-card p-6">
                <p className="text-muted-foreground text-sm">Mumbai Leads</p>
                <p className="text-3xl font-bold gradient-text">
                  {inquiries.filter((i) => i.preferred_area?.includes("Mumbai")).length}
                </p>
              </div>
              <div className="glass-card p-6">
                <p className="text-muted-foreground text-sm">Pune Leads</p>
                <p className="text-3xl font-bold gradient-text">
                  {inquiries.filter((i) => i.preferred_area?.includes("Pune")).length}
                </p>
              </div>
            </motion.div>

            {/* Filters & Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-4"
            >
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full lg:w-auto">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by area" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area === "all" ? "All Areas" : area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by budget" />
                    </SelectTrigger>
                    <SelectContent>
                      {budgets.map((budget) => (
                        <SelectItem key={budget} value={budget}>
                          {budget === "all" ? "All Budgets" : budget}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={fetchInquiries} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button variant="hero" onClick={handleExportCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
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
                      <TableHead>Contact</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Preferred Time</TableHead>
                      <TableHead>Visit Date</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : filteredInquiries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          No inquiries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInquiries.map((inquiry) => (
                        <TableRow key={inquiry.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{inquiry.name}</p>
                              {inquiry.message && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {inquiry.message}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="w-3 h-3 text-primary" />
                                <a
                                  href={`mailto:${inquiry.email}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {inquiry.email}
                                </a>
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3 text-primary" />
                                <a
                                  href={`tel:${inquiry.phone}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {inquiry.phone}
                                </a>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{inquiry.preferred_area || "-"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{inquiry.budget || "-"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{inquiry.preferred_time || "-"}</span>
                          </TableCell>
                          <TableCell>
                            {inquiry.appointment_date ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3 text-primary" />
                                {format(new Date(inquiry.appointment_date), "dd MMM yyyy")}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(inquiry.created_at), "dd MMM yyyy, HH:mm")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(inquiry.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </motion.div>

            <p className="text-center text-muted-foreground text-sm">
              Showing {filteredInquiries.length} of {inquiries.length} inquiries
            </p>
          </TabsContent>

          {/* Property Photos Tab */}
          <TabsContent value="photos">
            <PropertyPhotoManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
