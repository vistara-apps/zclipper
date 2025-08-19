import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe only when needed, not at module level
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    // Return null instead of throwing during build time
    return null;
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia', // Use latest API version
  });
};

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 503 }
      );
    }

    const { planName } = await request.json();

    // Define price mapping (you'll need to create these in Stripe Dashboard)
    const priceIds = {
      starter: process.env.STRIPE_PRICE_STARTER || 'price_starter',
      pro: process.env.STRIPE_PRICE_PRO || 'price_pro', 
      unlimited: process.env.STRIPE_PRICE_UNLIMITED || 'price_unlimited',
    };

    const priceId = priceIds[planName as keyof typeof priceIds];
    
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000'}/dashboard?cancelled=true`,
      metadata: {
        plan: planName,
      },
      discounts: [
        {
          coupon: 'ZCLIPPER50', // Create this coupon in Stripe for 50% off
        },
      ],
    });

    return NextResponse.json({ id: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}