import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  useStripe,
  useElements,
  CardElement,
} from '@stripe/react-stripe-js';
import { usePayment } from './Payments';
import ModalHeader from './ModalHeader';
import CloseButton from './CloseButton';
import { Button } from '../common/button';

// Create a separate component for the payment form that will be rendered inside <Elements>
const CheckoutForm = () => {
  const { apiResponse } = usePayment();
  const clientSecret = apiResponse?.clientSecret;
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Check if stripe or elements are null
    if (!stripe || !elements) {
      console.error('Stripe or elements is not loaded');
      return;
    }

    // Get the card element from elements
    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      console.error('Card element not found');
      return;
    }

    // Confirm the card payment with Stripe
    const { error } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
        },
      }
    );

    if (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <>
      <ModalHeader />
      <form onSubmit={handleSubmit}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '18px', // Increase font size
                color: '#424770',
                letterSpacing: '0.025em',
                fontFamily: 'Source Code Pro, monospace',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />

        <Button className='w-full mb-2' type='submit' style={{ marginTop: '50px' }}>
          Pay
        </Button>
      </form>
    </>
  );
};

const StripePayment = () => {
  // Initialize the stripePromise using the publishable key
  const stripePromise = loadStripe(
    'pk_test_51Jv003Am3pIKvv8ZLUIms5TxAGlkh2Ft9hyJ4uBb7KdZn4Y3Us3pavwBngpwR5WQOlWPM5PGLdW5VAcQbDRmyBXx001kLoYeF9'
  );

  return (
    <div className='h-auto'>
      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
      <div style={{ marginBottom: '10px' }}>
        <CloseButton />
      </div>
    </div>
  );
};

export default StripePayment;
