import React from 'react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-16 md:px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="px-8 py-12 md:px-12">
            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-black via-gray-800 to-gray-600 bg-clip-text text-transparent">
              Terms of Service
            </h1>
            <p className="text-gray-600 mb-8">
              Last Updated: January 18, 2025
            </p>

            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">1. Agreement to Terms</h2>
                <p className="text-gray-700 leading-relaxed">
                  By accessing or using Webinar Wise ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you do not have permission to access the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">2. Description of Service</h2>
                <p className="text-gray-700 mb-4">Webinar Wise is a SaaS platform that:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Integrates with Zoom to collect webinar data</li>
                  <li>Provides analytics and insights about webinar performance</li>
                  <li>Offers email marketing capabilities for webinar participants</li>
                  <li>Generates reports and data visualizations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">3. Account Registration</h2>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-900">3.1 Account Creation</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>You must provide accurate and complete information</li>
                  <li>You are responsible for maintaining account security</li>
                  <li>You must be at least 18 years old</li>
                  <li>One person or legal entity may maintain no more than one free account</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">3.2 Zoom Integration</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>You must have a valid Zoom account with appropriate permissions</li>
                  <li>You authorize us to access your Zoom data as specified during OAuth consent</li>
                  <li>We are not responsible for Zoom service availability or changes</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">4. Acceptable Use</h2>
                <p className="text-gray-700 mb-4">You agree NOT to:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Violate any laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Transmit malware or malicious code</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Use the Service to spam or harass others</li>
                  <li>Resell or redistribute the Service without permission</li>
                  <li>Exceed API rate limits or abuse the Service</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">5. Subscription and Payment</h2>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-900">5.1 Billing</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>Subscription fees are billed in advance</li>
                  <li>All fees are in USD unless otherwise stated</li>
                  <li>Prices are subject to change with 30 days notice</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">5.2 Refunds</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>Monthly subscriptions: No refunds for partial months</li>
                  <li>Annual subscriptions: Pro-rated refund within 30 days</li>
                  <li>No refunds for violations of these Terms</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">5.3 Free Trial</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Free trials may be offered at our discretion</li>
                  <li>Credit card may be required for free trials</li>
                  <li>You will be charged when the trial ends unless cancelled</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">6. Data and Privacy</h2>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-900">6.1 Your Data</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>You retain ownership of your data</li>
                  <li>You grant us license to process your data to provide the Service</li>
                  <li>We will not sell your data to third parties</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">6.2 Data Processing</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>We process data according to our Privacy Policy</li>
                  <li>You are responsible for having the right to share participant data</li>
                  <li>You must comply with privacy laws in your jurisdiction</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">6.3 Data Security</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>We implement industry-standard security measures</li>
                  <li>You are responsible for maintaining your account credentials</li>
                  <li>We are not liable for unauthorized access due to your negligence</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">7. Intellectual Property</h2>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-900">7.1 Our Property</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>The Service and its original content remain our property</li>
                  <li>You may not copy, modify, or reverse engineer the Service</li>
                  <li>Our trademarks and logos may not be used without permission</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">7.2 Your Content</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>You retain rights to your content</li>
                  <li>You grant us license to use your content to provide the Service</li>
                  <li>You represent that you have rights to all content you upload</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">7.3 Feedback</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Any feedback you provide becomes our property</li>
                  <li>We may use feedback without compensation to you</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">8. Service Availability</h2>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-900">8.1 Uptime</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>We strive for 99.9% uptime but do not guarantee it</li>
                  <li>Scheduled maintenance will be announced in advance</li>
                  <li>We are not liable for third-party service outages (Zoom, hosting, etc.)</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">8.2 Modifications</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>We may modify or discontinue features with notice</li>
                  <li>Major changes will be announced 30 days in advance</li>
                  <li>We may discontinue the Service with 90 days notice</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">9. Limitation of Liability</h2>
                <p className="text-gray-700 font-semibold mb-4">TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>We are not liable for indirect, incidental, or consequential damages</li>
                  <li>Our total liability is limited to the amount you paid us in the past 12 months</li>
                  <li>We are not responsible for lost profits or data</li>
                  <li>These limitations apply even if we knew of the possibility of damage</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">10. Disclaimer of Warranties</h2>
                <p className="text-gray-700 font-semibold mb-4">
                  THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Merchantability</li>
                  <li>Fitness for a particular purpose</li>
                  <li>Non-infringement</li>
                  <li>Accuracy or reliability of data</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">11. Indemnification</h2>
                <p className="text-gray-700 mb-4">You agree to indemnify and hold us harmless from claims arising from:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Your use of the Service</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any third-party rights</li>
                  <li>Your content or data</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">12. Termination</h2>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-900">12.1 By You</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>You may cancel your account at any time</li>
                  <li>Cancellation takes effect at the end of the billing period</li>
                  <li>Your data may be deleted 30 days after termination</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">12.2 By Us</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>We may terminate for violation of these Terms</li>
                  <li>We may terminate for non-payment</li>
                  <li>We may terminate with 90 days notice for any reason</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">12.3 Effect of Termination</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Access to the Service ceases immediately</li>
                  <li>You remain liable for charges incurred</li>
                  <li>Provisions that should survive termination will remain in effect</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">13. Dispute Resolution</h2>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-900">13.1 Informal Resolution</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>We prefer to resolve disputes informally</li>
                  <li>Contact <a href="mailto:support@webinarwise.io" className="text-blue-600 hover:text-blue-800">support@webinarwise.io</a> with concerns</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">13.2 Binding Arbitration</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>Disputes will be resolved through binding arbitration</li>
                  <li>Arbitration will be conducted by JAMS</li>
                  <li>Class actions and jury trials are waived</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">13.3 Exceptions</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Either party may seek injunctive relief in court</li>
                  <li>Small claims court is available for qualifying claims</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">14. General Provisions</h2>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-900">14.1 Governing Law</h3>
                <p className="text-gray-700 mb-4">These Terms are governed by the laws of [Your State/Country], without regard to conflict of law principles.</p>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">14.2 Entire Agreement</h3>
                <p className="text-gray-700 mb-4">These Terms constitute the entire agreement between you and Webinar Wise.</p>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">14.3 Severability</h3>
                <p className="text-gray-700 mb-4">If any provision is found unenforceable, the remaining provisions continue in effect.</p>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">14.4 Waiver</h3>
                <p className="text-gray-700 mb-4">Failure to enforce any right is not a waiver of that right.</p>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">14.5 Assignment</h3>
                <p className="text-gray-700">You may not assign these Terms. We may assign them without restriction.</p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">15. Changes to Terms</h2>
                <p className="text-gray-700 mb-4">We may update these Terms by:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Posting the revised Terms on our website</li>
                  <li>Notifying you via email for material changes</li>
                  <li>Requiring acceptance for continued use</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">16. Contact Information</h2>
                <div className="space-y-2 mb-4">
                  <p className="text-gray-700">General Inquiries: <a href="mailto:support@webinarwise.io" className="text-blue-600 hover:text-blue-800">support@webinarwise.io</a></p>
                  <p className="text-gray-700">Legal: <a href="mailto:legal@webinarwise.io" className="text-blue-600 hover:text-blue-800">legal@webinarwise.io</a></p>
                  <p className="text-gray-700">Privacy: <a href="mailto:privacy@webinarwise.io" className="text-blue-600 hover:text-blue-800">privacy@webinarwise.io</a></p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="text-gray-700 font-semibold mb-2">Mailing Address:</p>
                  <p className="text-gray-700">Webinarwise | 84, Ramkrishna Pally, Mukundapur, Kolkata -700099, West Bengal</p>
                </div>
                <p className="text-gray-700 italic">
                  By using Webinar Wise, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;