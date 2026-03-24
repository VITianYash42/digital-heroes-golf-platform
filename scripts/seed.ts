import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

// Load these from .env or override
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seedAdmin() {
  const adminEmail = "admin@golangcharity.com";
  const adminPassword = "SuperSecurePassword123!";

  console.log("Seeding an Administrator...");

  // Register the admin user using Auth API
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (userError) {
    console.error("Error creating user:", userError.message);
    return;
  }

  // Set the role in profiles. Usually there is a trigger that creates the profile
  // Here we assume it is created by the auth hook, so we update it.
  if (user?.user?.id) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "administrator", full_name: "System Administrator" })
      .eq("id", user.user.id);

    if (profileError) {
      console.error("Error updating profile role:", profileError.message);
    } else {
      console.log("Adinistrator profile configured.");
    }
  }

  console.log("===============================");
  console.log("Admin account created successfully!");
  console.log(`Admin Email: ${adminEmail}`);
  console.log(`Admin Password: ${adminPassword}`);
  console.log("===============================");
}

seedAdmin();