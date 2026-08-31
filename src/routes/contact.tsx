import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageSquare, Store, Bike } from "lucide-react";
import { MarketingPage, PageHero, Section, Reveal, SmartLink } from "@/components/marketing/blocks";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Talk to the Taylor Intelligence team" },
      {
        name: "description",
        content:
          "Questions about using Taylor, listing your store or becoming a delivery rider in South Africa? Send us a message and a real person will reply.",
      },
      { property: "og:title", content: "Contact Taylor Intelligence" },
      {
        property: "og:description",
        content: "Shopper support, store listings and rider applications — talk to a real person.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://heytaylor.co.za/contact" },
    ],
    links: [{ rel: "canonical", href: "https://heytaylor.co.za/contact" }],
  }),
  component: Contact,
});

const EMAIL = "hello@heytaylor.co.za";

function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Shopper support");
  const [message, setMessage] = useState("");

  const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(
    `[${topic}] ${name || "Website enquiry"}`,
  )}&body=${encodeURIComponent(`${message}\n\n—\n${name}\n${email}`)}`;

  return (
    <MarketingPage>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Talk to a{" "}
            <span className="italic text-primary">real person.</span>
          </>
        }
        subtitle="Whether you're a shopper with a question, a store owner ready to list, or a rider wanting to deliver — we read every message."
        primary={{ label: "Email us", to: `mailto:${EMAIL}` }}
        secondary={{ label: "Read the FAQ", to: "/faq" }}
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <form
              className="rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-9"
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = mailto;
              }}
            >
              <h2 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                Send us a message
              </h2>
              <p className="mt-2 text-sm text-muted">
                This opens your email app with everything filled in.
              </p>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Your name</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                    placeholder="Thandi Mokoena"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Email address</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                    placeholder="you@example.co.za"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">What is this about?</span>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  >
                    <option>Shopper support</option>
                    <option>Listing my store</option>
                    <option>Becoming a delivery rider</option>
                    <option>Partnerships & media</option>
                    <option>Privacy & data</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Message</span>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                    placeholder="Tell us what you need…"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-navy px-6 py-3.5 text-sm font-semibold text-white transition hover:scale-[1.01] sm:w-auto"
              >
                Send message
              </button>
            </form>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="space-y-5">
              <div className="rounded-3xl border border-border bg-mint p-7">
                <Mail className="mb-3 h-6 w-6 text-primary" strokeWidth={1.75} />
                <p className="text-sm font-semibold">Email us directly</p>
                <a href={`mailto:${EMAIL}`} className="mt-1 block text-sm text-muted hover:text-primary">
                  {EMAIL}
                </a>
              </div>

              <SmartLink
                to="https://heytaylor.co.za/store-onboarding"
                className="block rounded-3xl border border-border bg-card p-7 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <Store className="mb-3 h-6 w-6 text-primary" strokeWidth={1.75} />
                <p className="text-sm font-semibold">List your store</p>
                <p className="mt-1 text-sm text-muted">
                  Apply through the onboarding wizard — reviewed by our team.
                </p>
              </SmartLink>

              <SmartLink
                to="/for-riders"
                className="block rounded-3xl border border-border bg-card p-7 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <Bike className="mb-3 h-6 w-6 text-primary" strokeWidth={1.75} />
                <p className="text-sm font-semibold">Deliver with Taylor</p>
                <p className="mt-1 text-sm text-muted">
                  See how rider verification and order assignment works.
                </p>
              </SmartLink>

              <SmartLink
                to="/faq"
                className="block rounded-3xl border border-border bg-card p-7 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <MessageSquare className="mb-3 h-6 w-6 text-primary" strokeWidth={1.75} />
                <p className="text-sm font-semibold">Check the FAQ first</p>
                <p className="mt-1 text-sm text-muted">
                  Most questions about pricing, privacy and stores are answered there.
                </p>
              </SmartLink>
            </div>
          </Reveal>
        </div>
      </Section>
    </MarketingPage>
  );
}