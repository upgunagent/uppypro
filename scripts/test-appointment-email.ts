import { sendAppointmentEmail } from "../app/actions/email";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function testEmail() {
    console.log("Testing Appointment Email...");

    // Use an email we can check or at least see the Response from Resend
    const recipientEmail = "test@example.com"; // User can change this if needed

    try {
        const res = await sendAppointmentEmail({
            recipientEmail: recipientEmail,
            recipientName: "Test User",
            businessName: "Test Business",
            eventTitle: "Test Appointment",
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            employeeName: "John Doe"
        });

        console.log("Response:", res);
    } catch (e) {
        console.error("Exception:", e);
    }
}

testEmail();
