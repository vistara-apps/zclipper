// Stripe configuration for ZClipper.com monetization
import { loadStripe, Stripe } from '@stripe/stripe-js';

// Use your Stripe publishable key
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY_HERE';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// Pricing plans for ZClipper
export const PRICING_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    clips: 3,
    features: ['3 viral clips', 'Basic thumbnails', 'Community support']
  },
  starter: {
    name: 'Starter',
    price: 9.99,
    clips: 50,
    features: ['50 viral clips', 'HD thumbnails', 'Priority processing', 'Email support']
  },
  pro: {
    name: 'Pro', 
    price: 29.99,
    clips: 200,
    features: ['200 viral clips', 'Custom overlays', 'Instant processing', 'Direct support']
  },
  unlimited: {
    name: 'Unlimited',
    price: 99.99,
    clips: -1, // Unlimited
    features: ['Unlimited clips', 'Premium features', 'API access', 'White-label']
  }
};

export const createCheckoutSession = async (planName: string) => {
  try {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planName }),
    });

    const session = await response.json();
    
    if (session.error) {
      throw new Error(session.error);
    }

    const stripe = await getStripe();
    if (stripe) {
      await stripe.redirectToCheckout({ sessionId: session.id });
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Check if user has exceeded free limit
export const checkClipLimit = (userClips: number, planName: string = 'free') => {
  const plan = PRICING_PLANS[planName as keyof typeof PRICING_PLANS] || PRICING_PLANS.free;
  
  if (plan.clips === -1) return { canCreate: true, remaining: -1 }; // Unlimited
  
  return {
    canCreate: userClips < plan.clips,
    remaining: Math.max(0, plan.clips - userClips),
    needsUpgrade: userClips >= plan.clips
  };
};