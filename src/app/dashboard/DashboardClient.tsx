'use client';

import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { submitScore, uploadWinningProof } from './actions';
import { HeartIcon, ChartBarIcon, SparklesIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { useMemo, useRef, useState } from 'react';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

type Charity = {
  id: string;
  name: string;
};

type DashboardClientProps = {
  userId: string;
  profile: any;
  subscription: any;
  isSubscribed: boolean;
  charities: Charity[];
  scores: any[];
  totalWon: number;
  pendingWinning: any | null;
  latestPaymentStatus: string;
};

export default function DashboardClient({
  userId,
  profile,
  subscription,
  isSubscribed,
  charities,
  scores,
  totalWon,
  pendingWinning,
  latestPaymentStatus,
}: DashboardClientProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [planType, setPlanType] = useState<'monthly' | 'yearly'>('monthly');
  const [charityId, setCharityId] = useState(charities[0]?.id ?? '');
  const [contributionPercentage, setContributionPercentage] = useState<number>(10);
  const [uploadingProof, setUploadingProof] = useState(false);

  const renewalDate = useMemo(() => {
    if (!subscription?.current_period_end) return 'N/A';
    return new Date(subscription.current_period_end).toLocaleDateString();
  }, [subscription?.current_period_end]);

  async function startCheckout() {
    setCheckoutError('');

    if (!charityId) {
      setCheckoutError('Please select a charity before checkout.');
      return;
    }

    if (contributionPercentage < 10) {
      setCheckoutError('Contribution percentage must be at least 10%.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          plan_type: planType,
          charity_id: charityId,
          contribution_percentage: contributionPercentage,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to start checkout session.');
      }

      if (!payload.url) {
        throw new Error('Stripe session URL missing from response.');
      }

      window.location.href = payload.url as string;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start checkout.';
      setCheckoutError(message);
      setCheckoutLoading(false);
    }
  }

  if (!isSubscribed) {
    return (
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="p-6 md:p-8 max-w-4xl mx-auto min-h-screen">
        <motion.div variants={fadeInUp} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Complete Your Subscription</h1>
          <p className="text-slate-500 text-base md:text-lg mt-2">Activate your plan to enter draws, track scores, and support your chosen charity.</p>
        </motion.div>

        <motion.section variants={fadeInUp} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <CreditCardIcon className="w-28 h-28" />
          </div>

          <div className="space-y-6 relative z-10">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Choose Plan</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlanType('monthly')}
                  className={`rounded-xl px-4 py-3 border text-sm font-semibold transition ${
                    planType === 'monthly'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType('yearly')}
                  className={`rounded-xl px-4 py-3 border text-sm font-semibold transition ${
                    planType === 'yearly'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Yearly (Discounted)
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Select Charity</label>
              <select
                value={charityId}
                onChange={(event) => setCharityId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {charities.length === 0 ? (
                  <option value="">No charities available</option>
                ) : (
                  charities.map((charity) => (
                    <option key={charity.id} value={charity.id}>
                      {charity.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Contribution Percentage (Minimum 10%)</label>
              <input
                type="number"
                min={10}
                value={contributionPercentage}
                onChange={(event) => setContributionPercentage(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {checkoutError && (
              <p className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
                {checkoutError}
              </p>
            )}

            <button
              type="button"
              onClick={startCheckout}
              disabled={checkoutLoading || charities.length === 0}
              className="w-full rounded-xl bg-rose-600 px-5 py-3 text-white font-semibold hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {checkoutLoading ? 'Redirecting to Stripe...' : 'Subscribe via Stripe'}
            </button>
          </div>
        </motion.section>
      </motion.div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
      <motion.div variants={fadeInUp} className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Welcome, {profile.full_name || 'Impact Maker'}</h1>
        <p className="text-slate-500 text-lg mt-2">Manage your impact, track performance, and view rewards.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Module 1: Subscription & Charity */}
        <motion.section variants={fadeInUp} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <HeartIcon className="w-32 h-32" />
          </div>
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 z-10">
            <HeartIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 z-10">Subscription & Charity</h2>
          
          <div className="space-y-4 z-10 flex-1">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Status</p>
              <p className={`font-semibold text-lg ${subscription?.status === 'active' ? 'text-green-600' : 'text-slate-700'}`}>
                {(subscription?.status || 'inactive').toUpperCase()}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Renewal Date</p>
              <p className="font-semibold text-slate-900 text-lg">{renewalDate}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Selected Cause</p>
              <p className="font-semibold text-slate-900 text-lg">{subscription?.charities?.name || 'Not set'}</p>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <p className="text-sm text-rose-600 mb-1">Contribution Setup</p>
              <p className="font-bold text-rose-700 text-2xl">{subscription?.contribution_percentage}% <span className="text-sm font-normal text-rose-500">of subscription</span></p>
            </div>
          </div>
        </motion.section>

        {/* Module 2: Score Entry Interface */}
        <motion.section variants={fadeInUp} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col relative overflow-hidden lg:col-span-1">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <ChartBarIcon className="w-32 h-32" />
          </div>
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 z-10">
            <ChartBarIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2 z-10">Performance</h2>
          <p className="text-sm text-slate-500 mb-6 z-10">Log your Stableford scores (Max 5 recorded).</p>
          
          <form 
            ref={formRef}
            action={async (formData) => {
              await submitScore(formData);
              formRef.current?.reset();
            }} 
            className="flex flex-col gap-4 mb-8 z-10"
          >
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 block mb-1">Score (1-45)</label>
                <input type="number" name="score" min="1" max="45" required className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. 36" />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 block mb-1">Date</label>
                <input type="date" name="date" required className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-md shadow-blue-200">
              Log Score
            </button>
          </form>

          <div className="flex-1 z-10">
            <h3 className="font-semibold text-slate-900 mb-3">Recent Logs</h3>
            {scores.length === 0 ? (
              <p className="text-slate-500 text-sm italic">No scores logged yet.</p>
            ) : (
              <ul className="space-y-3">
                {scores.map((s: any) => (
                  <li key={s.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800">{s.stableford_score} pts</p>
                      <p className="text-xs text-slate-500">{new Date(s.played_date).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.section>

        {/* Module 3: Participation & Winnings */}
        <motion.section variants={fadeInUp} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <SparklesIcon className="w-32 h-32" />
          </div>
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 z-10">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 z-10">Draws & Rewards</h2>
          
          <div className="space-y-4 z-10 flex-1">
            <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-lg">
              <p className="text-slate-300 text-sm mb-1">Total Winnings</p>
              <p className="text-4xl font-extrabold tracking-tight">${totalWon.toFixed(2)}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center mt-2">
              <div>
                <p className="text-sm font-semibold text-slate-700">Payment Status</p>
                <p className="text-xs text-slate-500">Current payout lifecycle state</p>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${latestPaymentStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {latestPaymentStatus === 'pending' ? 'Pending' : 'Paid'}
              </span>
            </div>

            {pendingWinning && (
              <form
                action={async (formData) => {
                  setUploadingProof(true);
                  await uploadWinningProof(formData);
                  setUploadingProof(false);
                }}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-semibold text-slate-700">Upload Winning Proof</p>
                <input type="hidden" name="winning_id" value={pendingWinning.id} />
                <input
                  type="file"
                  name="proof"
                  accept="image/*,.pdf"
                  required
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white file:cursor-pointer"
                />
                <button
                  type="submit"
                  disabled={uploadingProof}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {uploadingProof ? 'Uploading...' : 'Submit Proof'}
                </button>
              </form>
            )}
          </div>
        </motion.section>

      </div>
    </motion.div>
  );
}