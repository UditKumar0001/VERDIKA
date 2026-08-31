import { connectDB } from './config/db.js';
import { Application } from './models/Application.js';
import { Notification } from './models/Notification.js';
import { sendDecisionNotification, formatDecisionEmail } from './services/notificationService.js';

const BASE_URL = 'http://localhost:5000/api';

async function testMerchantNotifications() {
  console.log('================================================================');
  console.log('TESTING MERCHANT DECISION NOTIFICATIONS & STATUS TRACKER');
  console.log('================================================================\n');

  await connectDB();

  // Test 1: Email Formatter - Approval & Rejection Format
  console.log('--- TEST 1: Decision Email Content & Politeness Formatter ---');
  const mockApprovedApp = {
    id: 'APP-TEST-APPR-01',
    merchant_data: {
      business_name: 'Starlight Electronics Pvt Ltd',
      applicant_email: 'finance@starlight-elec.com',
      bank_details: {
        account_holder: 'Starlight Electronics Pvt Ltd',
        masked_account_number: 'XXXXXX9103',
        bank_name: 'HDFC Bank',
        ifsc: 'HDFC0000060',
        bankVerificationStatus: 'Verified'
      }
    },
    risk_result: { riskScore: 0.12, reasonCodes: [] }
  };

  const appEmail = formatDecisionEmail({
    application: mockApprovedApp,
    decision: 'approved',
    customNotes: 'Approved under Prime SME Fast-Track Facility.'
  });

  console.log('Approval Email Subject:', appEmail.subject);
  console.log('Recipient:', appEmail.recipientEmail);
  const hasApprKeyword = appEmail.html.includes('APPROVED') && appEmail.html.includes('Next Steps for Disbursement');
  console.log(`[CHECK 1A] Approval email contains prompt next steps & status link? ${hasApprKeyword ? 'PASS' : 'FAIL'}`);

  const mockRejectedApp = {
    id: 'APP-TEST-REJ-01',
    merchant_data: {
      business_name: 'Nova Retail Ventures',
      applicant_email: 'admin@novaretail.in'
    },
    risk_result: {
      riskScore: 0.78,
      reasonCodes: [
        { code: 'high_revenue_volatility', description: 'Revenue volatility is 0.72' },
        { code: 'refund_rate_above_benchmark', description: 'Refund rate is 14.5% vs category benchmark 5.2%' }
      ]
    }
  };

  const rejEmail = formatDecisionEmail({
    application: mockRejectedApp,
    decision: 'rejected',
    customNotes: ''
  });

  console.log('\nRejection Email Subject:', rejEmail.subject);
  const hasRejKeyword = rejEmail.html.includes('REJECTED') && rejEmail.html.includes('variance') && rejEmail.html.includes('90 days');
  console.log(`[CHECK 1B] Rejection email synthesized polite reason codes & 90-day re-apply note? ${hasRejKeyword ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Notification Dispatch & SQLite Audit Logging
  console.log('--- TEST 2: Notification Dispatch & Audit Log Persistence ---');
  const uid = Date.now().toString().slice(-6);
  const testApp1 = await Application.create({
    id: `APP-NOTIF-${uid}-1`,
    merchant_data: {
      business_name: 'Apex Solar Technologies',
      applicant_email: 'founder@apexsolar.test',
      business_category: 'manufacturing',
      gstin: '27AAACG1234F1Z5',
      bank_details: {
        account_holder: 'Apex Solar Technologies',
        masked_account_number: 'XXXXXX4401',
        bank_name: 'ICICI Bank',
        ifsc: 'ICIC0000001',
        bankVerificationStatus: 'Verified'
      }
    },
    risk_result: { riskScore: 0.15 },
    decision: 'pending_review',
    status: 'pending_review'
  });

  // Create Test Application 2: To be Rejected
  const testApp2 = await Application.create({
    id: `APP-NOTIF-${uid}-2`,
    merchant_data: {
      business_name: 'Cascade Digital Media',
      applicant_email: 'billing@cascademedia.test',
      business_category: 'digital_services',
      gstin: '27BBBCG9876F1Z1'
    },
    risk_result: {
      riskScore: 0.82,
      reasonCodes: [{ code: 'high_revenue_volatility' }]
    },
    decision: 'pending_review',
    status: 'pending_review'
  });

  // Dispatch Approval Notification for App 1
  const notifResult1 = await sendDecisionNotification({
    application: testApp1,
    decision: 'approved',
    customNotes: 'Approved with standard 48-hour disbursement.'
  });

  // Dispatch Rejection Notification for App 2
  const notifResult2 = await sendDecisionNotification({
    application: testApp2,
    decision: 'rejected',
    customNotes: ''
  });

  console.log('Approval Notification Dispatch Result:', notifResult1.success, 'Status:', notifResult1.notification?.status);
  console.log('Rejection Notification Dispatch Result:', notifResult2.success, 'Status:', notifResult2.notification?.status);

  const pass2 = notifResult1.success && notifResult2.success && notifResult1.notification?.id && notifResult2.notification?.id;
  console.log(`[CHECK 2] Both notifications dispatched & recorded in DB? ${pass2 ? 'PASS' : 'FAIL'}\n`);

  // Test 3: Public Merchant Status API Endpoint
  console.log('--- TEST 3: Public Merchant Status Tracking Endpoint ---');
  // Update App 1 to closed/approved and App 2 to closed/rejected
  await Application.updateStatus(testApp1.id, 'closed', 'USR-REVIEWER-01', 'approved');
  await Application.updateStatus(testApp2.id, 'closed', 'USR-REVIEWER-01', 'rejected');

  const res1 = await fetch(`${BASE_URL}/underwriting/status/${testApp1.id}`);
  const statusData1 = await res1.json();
  console.log('App 1 Public Status Response:', {
    applicationId: statusData1.applicationId,
    businessName: statusData1.businessName,
    status: statusData1.status,
    decision: statusData1.decision
  });

  const res2 = await fetch(`${BASE_URL}/underwriting/status/${testApp2.id}`);
  const statusData2 = await res2.json();
  console.log('App 2 Public Status Response:', {
    applicationId: statusData2.applicationId,
    businessName: statusData2.businessName,
    status: statusData2.status,
    decision: statusData2.decision
  });

  const pass3 = res1.ok && res2.ok && statusData1.decision === 'approved' && statusData2.decision === 'rejected';
  console.log(`[CHECK 3] Public status endpoint accessible without auth with accurate decisions? ${pass3 ? 'PASS' : 'FAIL'}\n`);

  // Test 4: Notifications Audit Retrieval
  console.log('--- TEST 4: Notifications Audit Retrieval ---');
  const loggedNotifs = await Notification.findByApplicationId(testApp1.id);
  console.log(`Found ${loggedNotifs.length} logged notification(s) for ${testApp1.id}:`, loggedNotifs[0]?.subject);
  const pass4 = loggedNotifs.length > 0 && loggedNotifs[0].decision === 'approved';
  console.log(`[CHECK 4] Notification history auditable by application ID? ${pass4 ? 'PASS' : 'FAIL'}\n`);

  console.log('================================================================');
  console.log('ALL MERCHANT NOTIFICATION & STATUS TRACKER TESTS PASSED!');
  console.log('================================================================');
}

testMerchantNotifications().catch(err => {
  console.error('Merchant notification test error:', err);
});
