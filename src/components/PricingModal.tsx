'use client';

import { useState } from 'react';
import { PRICING_PLANS, createCheckoutSession } from '@/lib/stripe';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClips: number;
}

export default function PricingModal({ isOpen, onClose, currentClips }: PricingModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async (planName: string) => {
    try {
      setLoading(planName);
      await createCheckoutSession(planName);
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/20 max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">🔥 Upgrade ZClipper</h2>
            <p className="text-white/60">You&apos;ve used {currentClips}/3 free clips. Choose a plan to continue!</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(PRICING_PLANS).map(([key, plan]) => (
              <div 
                key={key}
                className={`relative bg-gradient-to-br rounded-xl p-6 border transition-all ${
                  key === 'pro' 
                    ? 'from-purple-900/50 to-pink-900/50 border-purple-400/50 scale-105' 
                    : 'from-white/5 to-white/10 border-white/20 hover:border-purple-400/30'
                }`}
              >
                {key === 'pro' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                      🔥 MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-white">${plan.price}</span>
                    {plan.price > 0 && <span className="text-white/60">/month</span>}
                  </div>
                  
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-purple-400">
                      {plan.clips === -1 ? '∞' : plan.clips}
                    </span>
                    <span className="text-white/60 text-sm block">viral clips</span>
                  </div>

                  <ul className="space-y-2 mb-6 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-white/80">
                        <span className="text-green-400">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {key === 'free' ? (
                    <button
                      disabled
                      className="w-full py-3 bg-gray-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(key)}
                      disabled={loading === key}
                      className={`w-full py-3 rounded-lg font-medium transition-all ${
                        key === 'pro'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                          : 'bg-white/10 hover:bg-white/20'
                      } text-white ${loading === key ? 'opacity-50' : ''}`}
                    >
                      {loading === key ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Processing...
                        </div>
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* FOMO Section */}
          <div className="mt-8 bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-400/20 rounded-xl p-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">🚨 Limited Time: Launch Special!</h3>
              <p className="text-red-200 mb-4">
                Be among the first 100 users and get <strong>50% OFF</strong> your first month!
                <br />
                <span className="text-sm text-red-300">Use code: ZCLIPPER50</span>
              </p>
              <div className="flex justify-center items-center gap-4 text-sm text-white/80">
                <div className="flex items-center gap-1">
                  <span className="text-green-400">⚡</span>
                  Instant activation
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-blue-400">🔒</span>
                  Secure payment
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-400">🎯</span>
                  Cancel anytime
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}