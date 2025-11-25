import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Create Stripe payment checkout session
 */
export async function createPaymentSession(order, successUrl, cancelUrl) {
  if (!stripe) {
    console.log('⚠️  Stripe not configured - payment disabled');
    return null;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Professional Audio Cleanup',
              description: `Order #${order.id.slice(0, 12)} - ${order.delivery_format}`,
            },
            unit_amount: Math.round(order.total_price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: order.id,
      customer_email: order.customer_email,
      metadata: {
        order_id: order.id,
        customer_name: order.customer_name,
      },
    });

    console.log('✅ Stripe checkout session created:', session.id);
    return session;

  } catch (error) {
    console.error('❌ Stripe session error:', error.message);
    throw error;
  }
}

/**
 * Verify Stripe webhook signature
 */
export function constructWebhookEvent(payload, signature) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    return event;
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error.message);
    throw error;
  }
}

/**
 * Get payment intent details
 */
export async function getPaymentIntent(paymentIntentId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('❌ Payment intent retrieval error:', error.message);
    throw error;
  }
}

/**
 * Create refund
 */
export async function createRefund(paymentIntentId, amount = null) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount, // null = full refund
    });

    console.log('✅ Refund created:', refund.id);
    return refund;
  } catch (error) {
    console.error('❌ Refund error:', error.message);
    throw error;
  }
}
