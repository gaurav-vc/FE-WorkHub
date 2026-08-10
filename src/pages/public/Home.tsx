import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Layers, Shield, Zap, Users, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" />
            <span className="font-bold text-xl tracking-tight text-slate-900">WorkHub</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <a href="#about" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">About & Purpose</a>
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Features</a>
            <a href="#security" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Security</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="hidden md:inline-flex text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">Log in</Button>
            </Link>
            <Link to="/login">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-white pt-24 pb-32">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="container relative mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
              Your workspace, <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">supercharged.</span>
            </h1>
            <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto mb-10">
              Connect teams, streamline workflows, and accelerate productivity with our all-in-one enterprise platform. Designed for modern teams.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/login">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-8 text-lg w-full sm:w-auto shadow-lg shadow-indigo-200">
                  Access Workspace <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Application Purpose Section */}
        <section id="about" className="py-24 bg-white border-t border-slate-100">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-6">Our Purpose & Integration</h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              WorkHub is a comprehensive enterprise productivity platform designed to centralize tasks, internal communications, and HR processes. 
              <strong> Why do we need Google access?</strong> To provide a seamless experience, WorkHub integrates directly with your Google Workspace. 
              By securely authenticating with your Google account, WorkHub can read your Gmail messages to automatically surface important client communications 
              and convert relevant emails directly into actionable tasks on your dashboard, saving you hours of manual data entry.
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything you need to work better</h2>
              <p className="mt-4 text-lg text-slate-600">A unified suite of tools built for speed and collaboration.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Lightning Fast</h3>
                <p className="text-slate-600">Navigate your tasks, projects, and communications with unprecedented speed and efficiency.</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Seamless Collaboration</h3>
                <p className="text-slate-600">Break down silos. Chat, share documents, and track progress all in one centralized hub.</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Enterprise Security</h3>
                <p className="text-slate-600">Your data is protected by industry-leading security protocols, encryption, and regular audits.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="py-24 bg-white">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <Shield className="h-16 w-16 text-indigo-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-6">Bank-grade Security</h2>
            <p className="text-lg text-slate-600 mb-8">
              WorkHub is built from the ground up with enterprise security in mind. 
              We utilize advanced encryption, strict access controls, and regular independent security audits 
              to ensure your organization's data remains private and protected at all times.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
              <Link to="/privacy-policy" className="text-indigo-600 font-medium hover:underline">Read our Privacy Policy &rarr;</Link>
              <span className="hidden sm:inline text-slate-300">|</span>
              <Link to="/terms-of-service" className="text-indigo-600 font-medium hover:underline">Terms of Service &rarr;</Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-slate-900">WorkHub</span>
            <span className="text-sm text-slate-500 ml-4">© {new Date().getFullYear()} WorkHub Inc.</span>
          </div>
          <div className="flex gap-6 text-sm font-medium">
            <Link to="/privacy-policy" className="text-slate-500 hover:text-indigo-600 transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="text-slate-500 hover:text-indigo-600 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
