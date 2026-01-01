import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

type UserRole = "admin" | "editor" | "viewer" | null;

export const useUserRole = (user: User | null) => {
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching role:", error);
          setRole(null);
        } else {
          setRole(data?.role as UserRole);
        }
      } catch (error) {
        console.error("Error fetching role:", error);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  const isAdminOrEditor = role === "admin" || role === "editor";

  return { role, isLoading, isAdminOrEditor };
};
