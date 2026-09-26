"use client";

import { useState, type FormEvent } from "react";

const ENQUIRY_TYPES: { value: string; label: string }[] = [
  { value: "GENERAL", label: "General Enquiry" },
  { value: "PROJECT", label: "Project Enquiry" },
  { value: "INTERIOR_DESIGN", label: "Interior Design" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "FIT_OUT", label: "Fit-Out" },
  { value: "EXHIBITION", label: "Exhibition" },
  { value: "DIGITAL_PLATFORM", label: "Digital Platform" },
  { value: "HSE_SAFETY", label: "HSE / Safety" },
  { value: "QUALITY_COMPLIANCE", label: "Quality / Compliance" },
];

const fieldClass =
  "w-full border border-border-strong bg-white px-4 py-3 text-[14px] text-text-primary outline-none placeholder:text-text-muted focus:border-brand-500";

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = e.currentTarget;
    const body = new FormData(form);

    const res = await fetch("/api/public/contact", { method: "POST", body }).catch(() => null);
    setSubmitting(false);

    if (!res || !res.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. Please try again, or email us directly.");
      return;
    }

    setSubmitted(true);
    form.reset();
  }

  if (submitted) {
    return (
      <div className="flex h-full flex-col items-center justify-center border border-border-strong bg-white p-10 text-center">
        <h3 className="font-serif text-[22px] text-brand-950">Thank you.</h3>
        <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
          Your enquiry has been received. Our team will review it and get back to you.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 text-[13px] font-medium text-brand-800 hover:underline"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col gap-5 border border-border-strong bg-white p-8 lg:p-10">
      {error && (
        <div className="border border-danger/30 bg-red-50 px-4 py-3 text-[13px] text-danger">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-[12px] font-medium uppercase tracking-wide text-text-muted">
          Full Name *
          <input name="name" required className={fieldClass} placeholder="Your name" />
        </label>
        <label className="flex flex-col gap-2 text-[12px] font-medium uppercase tracking-wide text-text-muted">
          Company
          <input name="company" className={fieldClass} placeholder="Company name" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-[12px] font-medium uppercase tracking-wide text-text-muted">
          Email *
          <input name="email" type="email" required className={fieldClass} placeholder="you@company.com" />
        </label>
        <label className="flex flex-col gap-2 text-[12px] font-medium uppercase tracking-wide text-text-muted">
          Enquiry Type *
          <select name="enquiryType" required defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Select an option
            </option>
            {ENQUIRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2 text-[12px] font-medium uppercase tracking-wide text-text-muted">
        Project / Area of Interest
        <input name="projectArea" className={fieldClass} placeholder="e.g. Villa interior fit-out" />
      </label>

      <label className="flex flex-1 flex-col gap-2 text-[12px] font-medium uppercase tracking-wide text-text-muted">
        Message *
        <textarea
          name="message"
          required
          minLength={10}
          rows={5}
          className={`${fieldClass} flex-1 resize-none`}
          placeholder="Tell us about your project or enquiry..."
        />
      </label>

      <label className="flex flex-col gap-2 text-[12px] font-medium uppercase tracking-wide text-text-muted">
        Attachment (Optional)
        <input name="attachment" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="text-[13px] text-text-secondary" />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 bg-brand-900 px-6 py-3.5 text-[13px] font-medium tracking-wide text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Submit Enquiry"}
      </button>
    </form>
  );
}
