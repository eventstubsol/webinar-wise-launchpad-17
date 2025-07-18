import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-16 md:px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="px-8 py-12 md:px-12">
            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-black via-gray-800 to-gray-600 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-gray-600 mb-8">
              Last Updated: January 18, 2025
            </p>

            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">1. Introduction</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Welcome to Webinar Wise ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h3 className="font-semibold mb-2 text-gray-900">Contact Information:</h3>
                  <p className="text-gray-700">Email: <a href="mailto:privacy@webinarwise.io" className="text-blue-600 hover:text-blue-800">privacy@webinarwise.io</a></p>
                  <p className="text-gray-700">Address: 84, Ramkrishna Pally, Mukundapur, Kolkata -700099, West Bengal</p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">2. Information We Collect</h2>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-900">2.1 Information You Provide to Us</h3>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-gray-900">Account Information:</h4>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Name and email address</li>
                    <li>Company name and job title</li>
                    <li>Phone number (optional)</li>
                    <li>Profile picture (if provided via Zoom OAuth)</li>
                  </ul>
                </div>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-gray-900">Zoom Integration Data:</h4>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Zoom account ID and user ID</li>
                    <li>Zoom account type and permissions</li>
                    <li>OAuth tokens (encrypted and stored securely)</li>
                  </ul>
                </div>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">2.2 Information Collected Automatically</h3>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-gray-900">Webinar Data from Zoom:</h4>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Webinar titles, descriptions, and settings</li>
                    <li>Participant information (names, emails, attendance duration)</li>
                    <li>Registration and attendance metrics</li>
                    <li>Engagement data (polls, Q&A, chat participation)</li>
                    <li>Recording metadata (not the recordings themselves)</li>
                  </ul>
                </div>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-gray-900">Usage Data:</h4>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Log data (IP address, browser type, pages visited)</li>
                    <li>Device information</li>
                    <li>Analytics data about how you use our service</li>
                  </ul>
                </div>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">2.3 Information from Third Parties</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Data from Zoom via OAuth integration</li>
                  <li>Payment information via our payment processor (Stripe)</li>
                  <li>Analytics data from Google Analytics</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">3. How We Use Your Information</h2>
                <p className="text-gray-700 mb-4">We use your information to:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Provide and maintain our service, including syncing your Zoom webinar data</li>
                  <li>Process your transactions and manage your subscription</li>
                  <li>Send administrative information about service updates or changes</li>
                  <li>Provide customer support and respond to your requests</li>
                  <li>Generate analytics and insights about your webinar performance</li>
                  <li>Improve our service through aggregated, anonymized usage data</li>
                  <li>Comply with legal obligations and protect our rights</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">4. Data Sharing and Disclosure</h2>
                <p className="text-gray-700 mb-4">We do not sell your personal information. We may share your information in these situations:</p>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-900">4.1 Service Providers</h3>
                <p className="text-gray-700 mb-2">We share data with third-party vendors who perform services for us:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>Supabase - Database and authentication</li>
                  <li>Render - Application hosting</li>
                  <li>Stripe - Payment processing</li>
                  <li>Resend - Email delivery</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">4.2 Business Transfers</h3>
                <p className="text-gray-700 mb-4">If we're involved in a merger, acquisition, or sale of assets, your information may be transferred.</p>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">4.3 Legal Requirements</h3>
                <p className="text-gray-700 mb-4">We may disclose information if required by law or to protect rights and safety.</p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">5. Data Security</h2>
                <p className="text-gray-700 mb-4">We implement appropriate technical and organizational measures to protect your data:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Encryption of sensitive data at rest and in transit</li>
                  <li>Access controls limiting who can access your data</li>
                  <li>Regular security audits and updates</li>
                  <li>Secure OAuth tokens with automatic refresh</li>
                  <li>SSL/TLS encryption for all data transmissions</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">6. Data Retention</h2>
                <p className="text-gray-700 mb-4">We retain your information for as long as necessary to provide our services:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Account data: Until account deletion</li>
                  <li>Webinar data: As configured in your sync settings</li>
                  <li>Analytics data: Up to 2 years</li>
                  <li>Logs: 30 days</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">7. Your Rights and Choices</h2>
                <p className="text-gray-700 mb-4">You have the right to:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate data</li>
                  <li>Delete your account and associated data</li>
                  <li>Export your data in a portable format</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Disconnect Zoom integration at any time</li>
                </ul>
                <p className="text-gray-700">
                  To exercise these rights, contact us at <a href="mailto:privacy@webinarwise.io" className="text-blue-600 hover:text-blue-800">privacy@webinarwise.io</a>.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">8. International Data Transfers</h2>
                <p className="text-gray-700">
                  Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">9. Children's Privacy</h2>
                <p className="text-gray-700">
                  Our service is not intended for children under 18. We do not knowingly collect information from children.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">10. Third-Party Services</h2>
                
                <h3 className="text-xl font-semibold mb-3 text-gray-900">10.1 Zoom Integration</h3>
                <p className="text-gray-700 mb-4">
                  Our service integrates with Zoom. Your use of Zoom is governed by Zoom's Privacy Policy. We only access data you explicitly authorize through OAuth.
                </p>

                <h3 className="text-xl font-semibold mb-3 text-gray-900">10.2 Analytics</h3>
                <p className="text-gray-700">
                  We use privacy-focused analytics to understand usage patterns. You can opt-out through your browser settings.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">11. California Privacy Rights</h2>
                <p className="text-gray-700 mb-4">California residents have additional rights under CCPA:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Right to know what personal information is collected</li>
                  <li>Right to know if personal information is sold or disclosed</li>
                  <li>Right to say no to the sale of personal information</li>
                  <li>Right to equal service and price</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">12. Changes to This Policy</h2>
                <p className="text-gray-700 mb-4">We may update this policy from time to time. We will notify you of any changes by:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Posting the new policy on this page</li>
                  <li>Updating the "Last Updated" date</li>
                  <li>Sending email notification for material changes</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4 text-gray-900">13. Contact Us</h2>
                <p className="text-gray-700 mb-4">If you have questions about this Privacy Policy, please contact us:</p>
                <p className="text-gray-700 mb-2">Email: <a href="mailto:privacy@webinarwise.io" className="text-blue-600 hover:text-blue-800">privacy@webinarwise.io</a></p>
                <p className="text-gray-700 mb-4">Support: <a href="mailto:support@webinarwise.io" className="text-blue-600 hover:text-blue-800">support@webinarwise.io</a></p>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-gray-900">Data Protection Officer:</h3>
                  <p className="text-gray-700">Name: Webinarwise Legal Team</p>
                  <p className="text-gray-700">Email: <a href="mailto:privacy@webinarwise.io" className="text-blue-600 hover:text-blue-800">privacy@webinarwise.io</a></p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;