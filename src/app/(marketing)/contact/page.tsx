import Image from "next/image";
import type { Metadata } from "next";
import { Container } from "@/components/marketing/container";
import { SectionLabel } from "@/components/marketing/section-label";
import { ContactForm } from "@/components/marketing/contact-form";
import { COMPANY_INFO, SIGN_IN_HREF } from "@/lib/site-config";
import { MarketingButton } from "@/components/marketing/marketing-button";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Shanfari Furnishing for project enquiries, interior design, fit-out and digital platform access.",
};

const ENQUIRY_OPTIONS = [
  "General Enquiry",
  "Project Enquiry",
  "Interior Design",
  "Furniture",
  "Fit-Out",
  "Exhibition",
  "Digital Platform",
  "HSE / Safety",
  "Quality / Compliance",
];

const FAQS = [
  {
    q: "What services does Shanfari Furnishing provide?",
    a: "Interior Design, Interior Furniture, Interior Fit Outs and Exhibition Set Works — see our Services page for details.",
  },
  {
    q: "Can I enquire about a project?",
    a: "Yes. Select “Project Enquiry” in the form and share as much detail as you can about your project.",
  },
  {
    q: "What types of projects does Shanfari undertake?",
    a: "Cultural, hospitality, religious and private residential projects — a curated selection is on our Projects page.",
  },
  {
    q: "Can I contact the team about interior fit-out?",
    a: "Yes, select “Fit-Out” as your enquiry type and our team will follow up.",
  },
  {
    q: "How can I access the digital platform?",
    a: "The platform is available to authorized Shanfari Furnishing users via Sign In. Select “Digital Platform” if you have a platform-related enquiry.",
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-border py-20 lg:py-24">
        <Container>
          <div className="max-w-xl">
            <SectionLabel>Get In Touch</SectionLabel>
            <h1 className="mt-6 font-serif text-[36px] leading-[1.15] text-brand-950 sm:text-[48px]">
              Let&rsquo;s Build Something Exceptional
            </h1>
            <p className="mt-6 text-[15px] leading-relaxed text-text-secondary">
              Connect with Shanfari Furnishing for project enquiries, collaboration, technical discussions and general
              enquiries.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 lg:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.2fr_1fr]">
            <ContactForm />

            <div className="flex flex-col gap-10">
              <div>
                <SectionLabel>Enquiry Options</SectionLabel>
                <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ENQUIRY_OPTIONS.map((o) => (
                    <li key={o} className="border border-border px-4 py-3 text-[13px] text-text-secondary">
                      {o}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <SectionLabel>Have a Project in Mind?</SectionLabel>
                <p className="mt-5 text-[14px] leading-relaxed text-text-secondary">
                  Share your ideas, requirements and vision with our team. We&rsquo;d be delighted to discuss how we can
                  bring your project to life.
                </p>
                <div className="relative mt-5 aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src="/images/shanfari/projects/taqah-palace-01.jpg"
                    alt="Exterior view of the Taqah Private Palace"
                    fill
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="object-cover"
                  />
                </div>
              </div>

              <div>
                <SectionLabel>Our Location</SectionLabel>
                <p className="mt-5 text-[14px] leading-relaxed text-text-secondary">{COMPANY_INFO.address}</p>
                <a href={`mailto:${COMPANY_INFO.email}`} className="mt-2 inline-block text-[14px] text-brand-800 hover:underline">
                  {COMPANY_INFO.email}
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-border py-16 lg:py-24">
        <Container>
          <div className="mb-10 max-w-xl">
            <SectionLabel>Frequently Asked</SectionLabel>
            <h2 className="mt-6 font-serif text-[28px] leading-tight text-brand-950 sm:text-[34px]">Common Questions</h2>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {FAQS.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-medium text-text-primary">
                  {item.q}
                  <span className="ml-4 text-text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-text-secondary">{item.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-border bg-brand-900 py-20 text-white">
        <Container className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-serif text-[28px] leading-tight text-white sm:text-[34px]">Ready to Enter Your Workspace?</h2>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/70">
              Access the connected environment built to bring your projects, information and operations together.
            </p>
          </div>
          <MarketingButton href={SIGN_IN_HREF} variant="inverse">
            Sign In
          </MarketingButton>
        </Container>
      </section>
    </>
  );
}
