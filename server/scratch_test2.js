import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

async function testAccounts() {
  const testCases = [
    { name: 'Standard Valid Test Account', acc: '7878787878787878', ifsc: 'HDFC0000060', holder: 'Sunrise Digital Solutions Pvt Ltd' },
    { name: 'Same Account Wrong Name', acc: '7878787878787878', ifsc: 'HDFC0000060', holder: 'Completely Wrong Fake Name LLC' },
    { name: 'Random Fake Account', acc: '98765432109876', ifsc: 'HDFC0000060', holder: 'Sunrise Digital Solutions Pvt Ltd' },
    { name: 'Invalid IFSC', acc: '7878787878787878', ifsc: 'INVALID12345', holder: 'Sunrise Digital Solutions Pvt Ltd' },
    { name: 'Short Account Number', acc: '12345', ifsc: 'HDFC0000060', holder: 'Sunrise Digital Solutions Pvt Ltd' }
  ];

  for (const tc of testCases) {
    console.log(`\n========================================`);
    console.log(`Testing: ${tc.name}`);
    console.log(`Inputs: acc=${tc.acc}, ifsc=${tc.ifsc}, holder=${tc.holder}`);

    try {
      // 1. Create Contact
      const contact = await rzp.api.post({
        url: '/contacts',
        data: {
          name: tc.holder,
          type: 'vendor',
          reference_id: `ref_${Date.now()}_${Math.floor(Math.random()*1000)}`
        }
      });
      console.log(`Contact Created ID: ${contact.id}`);

      // 2. Create Fund Account
      try {
        const fa = await rzp.fundAccount.create({
          contact_id: contact.id,
          account_type: 'bank_account',
          bank_account: {
            name: tc.holder,
            ifsc: tc.ifsc,
            account_number: tc.acc
          }
        });
        console.log(`Fund Account Created ID: ${fa.id}`);
        console.log(`FA Response Details:`, {
          id: fa.id,
          entity: fa.entity,
          active: fa.active,
          bank_account: fa.bank_account
        });

        // 3. Try Validation endpoint
        try {
          const val = await rzp.api.post({
            url: '/fund_accounts/validations',
            data: {
              account_number: '7878787878787878',
              fund_account: { id: fa.id },
              amount: 100,
              currency: 'INR'
            }
          });
          console.log(`FA Validation Success Response:`, val);
        } catch (valErr) {
          console.log(`FA Validation Error:`, valErr.statusCode, valErr.error || valErr.message);
        }

      } catch (faErr) {
        console.log(`Fund Account Creation Error:`, faErr.statusCode, faErr.error || faErr.message);
      }

    } catch (cErr) {
      console.log(`Contact Creation Error:`, cErr.statusCode, cErr.error || cErr.message);
    }
  }
}

testAccounts();
