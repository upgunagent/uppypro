
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase URL or Service Key");
    process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function deleteUser(email: string) {
    console.log(`Deleting user: ${email}`);

    // 1. Find User ID
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers();

    if (listError) {
        console.error("List Error:", listError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.log("User not found.");
        return;
    }

    // 2. Delete User
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
        console.error("Delete Error:", deleteError);
    } else {
        console.log("Successfully deleted user:", user.id);
    }
}

deleteUser("ottomanebay@gmail.com");
