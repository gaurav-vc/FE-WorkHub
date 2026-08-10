import React from 'react';
import { Layers } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link to="/home" className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" />
            <span className="font-bold text-xl tracking-tight text-slate-900">WorkHub</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-3xl bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
          <p className="text-sm text-slate-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-slate max-w-none space-y-6">
            <p>
              WorkHub ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by WorkHub.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">1. Information We Collect</h2>
            <p>
              We collect information from you when you register on our site, place an order, subscribe to our newsletter, respond to a survey, or fill out a form. We also collect data from third-party integrations you explicitly connect to your workspace.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">2. How We Use Your Information</h2>
            <p>
              Any of the information we collect from you may be used in one of the following ways:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To personalize your experience.</li>
              <li>To improve our platform and customer service.</li>
              <li>To process transactions.</li>
              <li>To send periodic emails regarding your order or other products and services.</li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">3. Google API Services Usage (Limited Use Policy)</h2>
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 my-4 rounded-r-md">
              <p className="font-medium text-indigo-900">
                Our app's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noopener noreferrer" className="underline text-indigo-700 hover:text-indigo-800">Google API Services User Data Policy</a>, including the Limited Use requirements.
              </p>
            </div>
            <p>
              Specifically, when you connect your Google/Gmail account to WorkHub, we only use the requested permissions (such as reading emails or calendar events) to display that information directly to you within your workspace. We do not sell your Google data, nor do we use it for advertising purposes.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">4. Security of Your Data</h2>
            <p>
              We implement a variety of security measures to maintain the safety of your personal information when you enter, submit, or access your personal information. We use state-of-the-art encryption and secure servers.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-4">5. Contact Us</h2>
            <p>
              If there are any questions regarding this privacy policy, you may contact us using the information on our website.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} WorkHub Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
