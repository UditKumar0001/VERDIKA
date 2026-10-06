import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log('Using Keys:', keyId, keySecret ? '***' : 'missing');

const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

async function runTest() {
  try {
    // 1. Create Contact
    console.log('\n--- Creating Contact ---');
    const contact = await rzp.api.post({
      url: '/contacts',
      data: {
        name: 'Acme Test Corp',
        type: 'vendor',
        reference_id: `ref_${Date.now()}`
      }
    });
    console.log('Contact Created:', contact);

    // 2. Create Fund Account with test account
    console.log('\n--- Creating Fund Account ---');
    const fundAccount = await rzp.fundAccount.create({
      contact_id: contact.id,
      account_type: 'bank_account',
      bank_account: {
        name: 'Acme Test Corp',
        ifsc: 'HDFC0000060',
        account_number: '7878787878787878' // Standard test account
      }
    });
    console.log('Fund Account Created:', fundAccount);

    // 3. Create FAV
    console.log('\n--- Creating Validation ---');
    try {
      const val = await rzp.api.post({
        url: '/fund_accounts/validations',
        data: {
          account_number: '7878787878787878',
          fund_account: { id: fundAccount.id },
          amount: 100,
          currency: 'INR',
          notes: { test: '1' }
        }
      });
      console.log('Validation Response:', val);
    } catch (valErr) {
      console.log('Validation Error Status:', valErr.statusCode);
      console.log('Validation Error Details:', JSON.stringify(valErr.error || valErr.message || valErr, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

runTest();
