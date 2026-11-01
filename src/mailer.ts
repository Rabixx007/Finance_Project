import { config } from "./config";

export type MailRecord = {
  id: string;
  email: string;
  name: string;
  reimbursement_type: string;
  claimed_amount: string;
  amount_received: string;
  reimbursed_on: string;
  comment: string | null;
};

// Plain text on purpose: there is no markup, so no HTML to inject into.
// The wording is a placeholder until the final template is decided.
function buildMail(r: MailRecord) {
  const lines = [
    `Dear ${r.name},`,
    "",
    `This is to confirm that a reimbursement has been processed to you on ${r.reimbursed_on}.`,
    "",
    `Type: ${r.reimbursement_type}`,
    `Claimed amount: ${r.claimed_amount}`,
    `Amount reimbursed: ${r.amount_received}`,
    ...(r.comment ? [`Note: ${r.comment}`] : []),
    "",
    "Regards,",
    "Finance Office",
  ];
  return {
    subject: `Reimbursement processed on ${r.reimbursed_on}`,
    text: lines.join("\n"),
  };
}

export async function sendReimbursementMail(r: MailRecord): Promise<void> {
  const { subject, text } = buildMail(r);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.MAIL_FROM,
      to: [r.email],
      subject,
      text,
    }),
  });

  // Log only the status code. The response body can echo request details.
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(`mail provider responded ${res.status}: ${body.message ?? "no details"}`);
  }
}
