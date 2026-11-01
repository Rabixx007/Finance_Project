exports.up = (pgm) => {
  pgm.createTable("users", {
    id: { type: "bigserial", primaryKey: true },
    email: { type: "text", notNull: true, unique: true },
    password_hash: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("reimbursements", {
    id: { type: "bigserial", primaryKey: true },
    email: { type: "text", notNull: true },
    name: { type: "text", notNull: true },
    college_id: { type: "text", notNull: true },
    reimbursement_type: { type: "text", notNull: true },
    claimed_amount: { type: "numeric(12,2)", notNull: true },
    amount_received: { type: "numeric(12,2)", notNull: true },
    comment: { type: "text" },
    reimbursed_on: { type: "date", notNull: true },
    mail_status: { type: "text", notNull: true, default: "pending" },
    mail_sent_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.addConstraint("reimbursements", "reimbursements_type_check", {
    check: "reimbursement_type IN ('medical', 'salary', 'travel', 'other')",
  });

  pgm.addConstraint("reimbursements", "reimbursements_mail_status_check", {
    check: "mail_status IN ('pending', 'sent', 'failed')",
  });

  pgm.addConstraint("reimbursements", "reimbursements_amounts_check", {
    check: "claimed_amount >= 0 AND amount_received >= 0",
  });

  pgm.addConstraint("reimbursements", "reimbursements_no_duplicates", {
    unique: ["email", "reimbursed_on", "reimbursement_type"],
  });
};

exports.down = (pgm) => {
  pgm.dropTable("reimbursements");
  pgm.dropTable("users");
};