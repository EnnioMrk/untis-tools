import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/paddle';

/**
 * Paddle Webhook Handler
 * 
 * Handles the following events:
 * - subscription.activated: User upgraded to PREMIUM
 * - subscription.canceled: User downgraded to FREE
 * - subscription.updated: Subscription details updated
 * - transaction.completed: Payment confirmation
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    
    // Get signature from header
    const signature = request.headers.get('paddle-signature') || '';
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(signature, body);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const payload = JSON.parse(body);
    const eventType = payload.event_type;
    const eventData = payload.data;

    console.log(`Received Paddle webhook: ${eventType}`);

    // Handle different event types
    switch (eventType) {
      case 'subscription.activated':
        await handleSubscriptionActivated(eventData);
        break;
      
      case 'subscription.canceled':
        await handleSubscriptionCanceled(eventData);
        break;
      
      case 'subscription.updated':
        await handleSubscriptionUpdated(eventData);
        break;
      
      case 'transaction.completed':
        await handleTransactionCompleted(eventData);
        break;
      
      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription.activated event
 * Upgrade user to PREMIUM
 */
async function handleSubscriptionActivated(data: {
  id: string;
  customer_id: string;
  custom_data?: { userId?: string };
}) {
  const { id: subscriptionId, customer_id: customerId, custom_data } = data;
  
  // Get userId from custom_data or find by paddleCustomerId
  let userId = custom_data?.userId;
  
  if (!userId) {
    // Find user by paddleCustomerId
    const user = await prisma.user.findFirst({
      where: { paddleCustomerId: customerId },
      select: { id: true },
    });
    userId = user?.id;
  }

  if (!userId) {
    console.error(`No user found for customer ID: ${customerId}`);
    return;
  }

  // Update user to PREMIUM
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: 'PREMIUM',
      paddleCustomerId: customerId,
      paddleSubscriptionId: subscriptionId,
    },
  });

  console.log(`User ${userId} upgraded to PREMIUM`);
}

/**
 * Handle subscription.canceled event
 * Downgrade user to FREE
 */
async function handleSubscriptionCanceled(data: {
  id: string;
  customer_id: string;
  custom_data?: { userId?: string };
}) {
  const { id: subscriptionId, customer_id: customerId, custom_data } = data;
  
  // Get userId from custom_data or find by paddleSubscriptionId
  let userId = custom_data?.userId;
  
  if (!userId) {
    // Find user by paddleSubscriptionId
    const user = await prisma.user.findFirst({
      where: { paddleSubscriptionId: subscriptionId },
      select: { id: true },
    });
    userId = user?.id;
  }

  if (!userId) {
    // Try finding by customer ID
    const user = await prisma.user.findFirst({
      where: { paddleCustomerId: customerId },
      select: { id: true },
    });
    userId = user?.id;
  }

  if (!userId) {
    console.error(`No user found for subscription ID: ${subscriptionId}`);
    return;
  }

  // Update user to FREE
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: 'FREE',
      paddleSubscriptionId: null,
    },
  });

  console.log(`User ${userId} downgraded to FREE`);
}

/**
 * Handle subscription.updated event
 * Update subscription details if needed
 */
async function handleSubscriptionUpdated(data: {
  id: string;
  customer_id: string;
  status: string;
  custom_data?: { userId?: string };
}) {
  const { id: subscriptionId, customer_id: customerId, status, custom_data } = data;
  
  // Get userId from custom_data or find by paddleCustomerId
  let userId = custom_data?.userId;
  
  if (!userId) {
    const user = await prisma.user.findFirst({
      where: { paddleCustomerId: customerId },
      select: { id: true },
    });
    userId = user?.id;
  }

  if (!userId) {
    console.error(`No user found for customer ID: ${customerId}`);
    return;
  }

  // If subscription is active, ensure user is PREMIUM
  // If subscription is paused/canceled, handle accordingly
  if (status === 'active') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'PREMIUM',
        paddleCustomerId: customerId,
        paddleSubscriptionId: subscriptionId,
      },
    });
    console.log(`User ${userId} subscription updated - status: active`);
  } else if (status === 'canceled' || status === 'expired') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'FREE',
        paddleSubscriptionId: null,
      },
    });
    console.log(`User ${userId} subscription updated - status: ${status}`);
  }
}

/**
 * Handle transaction.completed event
 * Payment confirmation (optional logging)
 */
async function handleTransactionCompleted(data: {
  id: string;
  customer_id: string;
  subscription_id?: string;
  status: string;
  custom_data?: { userId?: string };
}) {
  const { id: transactionId, customer_id: customerId, subscription_id: subscriptionId, status } = data;
  
  console.log(`Transaction ${transactionId} completed for customer ${customerId}, status: ${status}`);
  
  // If there's a subscription ID, ensure user is premium
  if (subscriptionId) {
    const user = await prisma.user.findFirst({
      where: { paddleCustomerId: customerId },
      select: { id: true, plan: true },
    });

    if (user && user.plan !== 'PREMIUM') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: 'PREMIUM',
          paddleSubscriptionId: subscriptionId,
        },
      });
      console.log(`User ${user.id} upgraded to PREMIUM via transaction.completed`);
    }
  }
}
