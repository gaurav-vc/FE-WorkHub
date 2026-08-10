import React from 'react';
import { Layers } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link to="/home" className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" />
            <span className="font-bold text-xl tracking-tight text-slate-900">Workhub</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-3xl bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Terms of Service</h1>
          <p className="text-sm text-slate-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-slate max-w-none space-y-6">
            <p>
              Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Workhub platform (the "Service") operated by Workhub Inc ("us", "we", or "our").
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">2. Subscriptions and Billing</h2>
            <p>
              Some parts of the Service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis (such as monthly or annually), depending on the type of subscription plan you select.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">3. Content and Data</h2>
            <p>
              Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the content that you post to the Service, including its legality, reliability, and appropriateness.
            </p>
            <p>
              By utilizing our third-party integrations (such as connecting your Google account), you authorize us to access and use the connected data strictly for the purpose of providing you the Service features, in accordance with our Privacy Policy.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">4. Acceptable Use</h2>
            <p>
              You agree not to use the Service:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>In any way that violates any applicable national or international law or regulation.</li>
              <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter," "spam," or any other similar solicitation.</li>
              <li>To impersonate or attempt to impersonate Workhub, a Workhub employee, another user, or any other person or entity.</li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">5. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">6. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Workhub Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
