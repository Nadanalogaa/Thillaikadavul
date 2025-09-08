import React, { useState } from 'react';

const EmailTestPage: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [testing, setTesting] = useState(false);

  const testEmail = async () => {
    setTesting(true);
    setResult('Testing email function...');
    
    try {
      // Test the actual Vercel serverless function
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'mathan.pv@gmail.com',
          name: 'Test User',
          subject: 'Test Email from Nadanaloga',
          message: `This is a test email to verify the email system is working correctly.

If you receive this email, the system is functioning properly!

Test Time: ${new Date().toLocaleString()}
System: Email Test Page`
        })
      });

      const data = await response.json();
      console.log('Email test response:', data);
      
      if (response.ok && data.success) {
        setResult(`✅ SUCCESS!
Method: ${data.method}
Message: ${data.message}
Recipient: ${data.recipient}
${data.formspreeResponse ? `Formspree ID: ${JSON.stringify(data.formspreeResponse)}` : ''}
${data.emailContent ? `Email Content Logged: Yes` : ''}`);
      } else {
        setResult(`❌ FAILED!
Status: ${response.status}
Error: ${data.error || 'Unknown error'}
Details: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      setResult(`❌ NETWORK ERROR: ${error.message}`);
      console.error('Email test error:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Email Function Test
          </h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              This will test the email function by sending a test email to mathan.pv@gmail.com
            </p>
          </div>

          <button
            onClick={testEmail}
            disabled={testing}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              testing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            {testing ? 'Testing...' : 'Send Test Email'}
          </button>

          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Result:</h3>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">{result}</pre>
            </div>
          )}

          <div className="mt-6 text-xs text-gray-500">
            <p>Expected behavior:</p>
            <ul className="list-disc ml-4 mt-1">
              <li>Success message should appear above</li>
              <li>Email should be delivered to mathan.pv@gmail.com</li>
              <li>Check console for detailed logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTestPage;