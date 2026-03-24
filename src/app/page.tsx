'use client';

import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import Link from 'next/link';
import { HeartIcon, ChartBarIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import AuthNav from '@/components/AuthNav';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-rose-200 selection:text-slate-900 flex flex-col">
      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="text-2xl font-extrabold tracking-tight text-slate-900">
          Impact<span className="text-rose-600">Platform</span>
        </div>
        <AuthNav />
      </header>

      <main className="flex-1 flex flex-col items-center w-full">
        {/* HERO SECTION */}
        <section className="w-full px-6 py-24 md:py-32 flex flex-col items-center text-center max-w-5xl mx-auto">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8 flex flex-col items-center">
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 text-rose-800 text-sm font-semibold tracking-wide">
              <HeartIcon className="w-4 h-4" />
              <span>Empowering causes worldwide</span>
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Turn Your Passion Into <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-400">Meaningful Change.</span>
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed">
              Join a community driven by purpose. Enter your scores, unlock opportunities for monthly rewards, and seamlessly fund the charities that matter most to you.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="pt-4 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/dashboard" className="group relative flex items-center justify-center gap-2 bg-rose-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-xl shadow-rose-200 hover:bg-rose-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                Subscribe Now
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="w-full bg-white py-24 border-y border-slate-100">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp} className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">How It Works</h2>
              <p className="mt-4 text-slate-500 text-lg">Three simple steps to making a difference.</p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <motion.div variants={fadeInUp} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <ChartBarIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">1. Track Your Performance</h3>
                <p className="text-slate-600 leading-relaxed">Submit your recent scores on our secure platform. We seamlessly track and organize your performance history.</p>
              </motion.div>

              {/* Step 2 */}
              <motion.div variants={fadeInUp} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                  <SparklesIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">2. Monthly Reward Draws</h3>
                <p className="text-slate-600 leading-relaxed">Your participation grants you entry into our transparent monthly draws. Match the numbers, and win incredible prize pools.</p>
              </motion.div>

              {/* Step 3 */}
              <motion.div variants={fadeInUp} className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                  <HeartIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">3. Deliver Real Impact</h3>
                <p className="text-slate-600 leading-relaxed">Choose your favored cause. A reliable baseline of your subscription fuels verified charities, scaling as our community grows.</p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CHARITY IMPACT SECTION */}
        <section className="w-full px-6 py-24 bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-500 via-transparent to-transparent"></div>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-extrabold">A Commitment to Care.</h2>
              <p className="text-xl text-slate-300 leading-relaxed">
                We believe in transparent, automated giving. That's why <strong className="text-white">a guaranteed 10% minimum</strong> of every single subscription goes directly to the charity you personally select from our vetted index.
              </p>
              <p className="text-lg text-slate-400">
                Want to do more? You can voluntarily increase your contribution directly from your dashboard giving you complete control over your localized impact.
              </p>
              <button className="mt-4 px-6 py-3 border border-slate-600 hover:border-slate-400 hover:bg-slate-800 rounded-full font-semibold transition-all">
                Explore Our Charities
              </button>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-slate-800/50 backdrop-blur-sm p-10 rounded-[2.5rem] border border-slate-700 flex flex-col items-center text-center shadow-2xl">
              <div className="text-rose-500 font-extrabold text-8xl md:text-9xl tracking-tighter mb-4">
                10%<span className="text-4xl text-rose-400">+</span>
              </div>
              <div className="text-2xl font-bold text-white mb-2">Direct Contribution</div>
              <p className="text-slate-400">Minimum monthly routing to the cause of your choice, completely fee-free on our end.</p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-slate-50 py-12 border-t border-slate-200 mt-auto text-center md:text-left">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-bold text-slate-900 tracking-tight">
            Impact<span className="text-rose-600">Platform</span>
          </div>
          <nav className="flex gap-6 text-sm font-medium text-slate-500">
            <Link href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">Contact</Link>
            <Link href="/admin" className="hover:text-rose-600 transition-colors md:ml-4 md:border-l md:border-slate-300 md:pl-4">Admin</Link>
          </nav>
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-8 text-sm text-slate-400 text-center md:text-left">
          &copy; {new Date().getFullYear()} ImpactPlatform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}