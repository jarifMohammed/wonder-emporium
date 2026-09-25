import 'dotenv/config';

async function testSendDummyEmail() {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const targetEmail = 'zihadul708@gmail.com';

  console.log('=== Wonder Emporium Microsoft Email Test ===');
  console.log('Tenant ID:', tenantId);
  console.log('Client ID:', clientId);
  console.log('Sender Email:', senderEmail);
  console.log('Target Email:', targetEmail + '\n');

  console.log('1. Acquiring OAuth2 token from Microsoft identity platform...');
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('grant_type', 'client_credentials');

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error('❌ Failed to get access token:', tokenData);
    return;
  }

  console.log('✅ Token acquired successfully!');
  const token = tokenData.access_token;
  
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  console.log('App Display Name in Azure:', payload.app_displayname);
  console.log('Roles/Permissions in token:', payload.roles || '(None currently granted)');

  console.log(`\n2. Attempting to send dummy email via Microsoft Graph API to ${targetEmail} from ${senderEmail}...`);

  const mailPayload = {
    message: {
      subject: 'Wonder Emporium - Test Email Verification',
      body: {
        contentType: 'HTML',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #24352f;">✨ Wonder Emporium Email Test</h2>
            <p>Hi Zihad,</p>
            <p>This is a dummy test email verifying that Microsoft Graph API email integration is successfully configured on your backend.</p>
            <div style="background-color: #f4f6f8; padding: 16px; border-radius: 6px; margin: 16px 0;">
              <p style="margin: 0; font-size: 14px; color: #333;"><strong>Service:</strong> Microsoft Graph API</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #333;"><strong>Recipient:</strong> zihadul708@gmail.com</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #333;"><strong>Status:</strong> Success</p>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 24px;">Wonder Emporium &copy; ${new Date().getFullYear()}</p>
          </div>
        `,
      },
      toRecipients: [
        {
          emailAddress: {
            address: targetEmail,
          },
        },
      ],
    },
    saveToSentItems: 'true',
  };

  const sendRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailPayload),
    },
  );

  if (sendRes.status === 202 || sendRes.ok) {
    console.log('🎉 SUCCESS: Test email sent successfully to ' + targetEmail + '!');
  } else {
    const errorBody = await sendRes.text();
    console.error(`\n⚠️ Microsoft Graph API responded with status ${sendRes.status}:`);
    console.error(errorBody);
  }
}

testSendDummyEmail();
