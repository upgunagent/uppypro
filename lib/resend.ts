import { Resend } from 'resend';

// Use provided key if env not set for dev, but strongly prefer env
const resendApiKey = process.env.RESEND_API_KEY!;

export const resend = new Resend(resendApiKey);

// Domain to send from
export const EMAIL_FROM = 'UppyPro <noreply@upgunai.com>';
