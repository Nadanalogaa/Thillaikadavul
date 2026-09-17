import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

// Refund & Cancellation Policy — required by the payment gateway (Razorpay)
// for website verification. Keep in line with how fees actually work in the app.
const RefundPolicyPage: React.FC = () => {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const sections: { title: string; points: React.ReactNode[] }[] = [
    {
      title: 'Monthly fees',
      points: [
        'Fees are billed monthly for each course a student is enrolled in. Bills are generated on the 1st of every month and are due by the 10th.',
        'A student who joins partway through a month pays only for the remaining days of that month (pro-rata).',
        'Fees can be paid online through UPI (Google Pay or PhonePe, processed securely by Razorpay) or in cash at the academy office. A receipt is issued for every payment.',
        'Fees are paid month by month; we do not accept payment in advance for future months.',
      ],
    },
    {
      title: 'Cancellation',
      points: [
        'To discontinue a course, please inform the academy office (by email, WhatsApp or in person) before the 1st of the month. No bill will be generated for the following months.',
        'A bill already generated for a month remains payable for that month.',
      ],
    },
    {
      title: 'Refunds',
      points: [
        'Fees paid for a month in which classes have been conducted are not refundable.',
        'If a fee was paid twice, or more than the amount due was paid, the extra amount is refunded in full.',
        'If money was debited but the payment failed or was not received by us, it is normally returned to your account automatically by your bank or Razorpay within 5–7 working days. If it is not, please contact us with the transaction details.',
        'Approved refunds of online payments are returned to the original payment method within 5–7 working days. Cash payments are refunded at the academy office.',
      ],
    },
    {
      title: 'How to request a refund',
      points: [
        <>Contact the academy office with the student's name and the receipt number (for example NDA-R-000123). You can reach us at <a className="text-indigo-600 dark:text-indigo-400 underline" href="mailto:nadanalogaa@gmail.com">nadanalogaa@gmail.com</a> or through the details on our <Link className="text-indigo-600 dark:text-indigo-400 underline" to="/contact">Contact page</Link>.</>,
      ],
    },
  ];

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className={`text-3xl sm:text-4xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
          Refund &amp; Cancellation Policy
        </h1>
        <p className={`mt-3 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
          Nadanaloga Fine Arts Academy · Last updated September 2026
        </p>
        <div className="mt-10 space-y-6">
          {sections.map(section => (
            <section
              key={section.title}
              className={`rounded-2xl border p-6 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
            >
              <h2 className={`text-xl font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{section.title}</h2>
              <ul className={`mt-3 space-y-2 list-disc pl-5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {section.points.map((p, i) => <li key={i} className="leading-relaxed">{p}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RefundPolicyPage;
