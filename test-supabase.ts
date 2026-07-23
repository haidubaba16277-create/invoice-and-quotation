import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(rawUrl, supabaseAnonKey);

async function run() {
  console.log('Testing Supabase Connection...');
  console.log('URL:', rawUrl);
  
  // Test 1: Fetch from payments
  try {
    const { data, error } = await supabase.from('payments').select('*').limit(1);
    if (error) {
      console.log('Error fetching payments:', error);
    } else {
      console.log('Payments fetch success! Rows:', data);
    }
  } catch (err) {
    console.log('Exception fetching payments:', err);
  }

  // Test 2: Fetch from customer_notifications
  try {
    const { data, error } = await supabase.from('customer_notifications').select('*').limit(1);
    if (error) {
      console.log('Error fetching customer_notifications:', error);
    } else {
      console.log('Customer notifications fetch success! Rows:', data);
    }
  } catch (err) {
    console.log('Exception fetching customer_notifications:', err);
  }

  // Test 3: Fetch from subscriptions
  try {
    const { data, error } = await supabase.from('subscriptions').select('*').limit(1);
    if (error) {
      console.log('Error fetching subscriptions:', error);
    } else {
      console.log('Subscriptions fetch success! Rows:', data);
    }
  } catch (err) {
    console.log('Exception fetching subscriptions:', err);
  }

  // Test 4: Fetch from profiles
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
      console.log('Error fetching profiles:', error);
    } else {
      console.log('Profiles fetch success! Rows:', data);
    }
  } catch (err) {
    console.log('Exception fetching profiles:', err);
  }
}

run();
