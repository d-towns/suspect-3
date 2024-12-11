import { Card, ScrollArea } from '@radix-ui/themes';
import React from 'react';

const Terms: React.FC = () => {
    return (

        <Card size="3" variant="surface" style={{ width: '100%', maxWidth: '800px', padding: '50px', margin:' 40px auto'}} >

<h1 className="text-3xl text-center font-bold mb-4">Terms of Service and End User License Agreement</h1>
                    <ScrollArea style={{height: '100vh'}} > 
            
            <section className="mb-4">
                <h2 className="text-2xl font-semibold">1. Service Provider</h2>
                <p>1.1 These Terms of Service ("Terms") govern your use of Suspect, a product owned and operated by Company Towns Capital LLC, a Michigan registered corporation with principal place of business at 6272 Saginaw Road #1075
                Flint, Michigan 48439, US.</p>
            </section>

            <section className="mb-4">
                <h2 className="text-2xl font-semibold">2. Ownership and Licensing</h2>
                <p>2.1 Suspect is an exclusive product of Company Towns Capital LLC.</p>
                <p>2.2 All rights to the game, including software, design, and associated intellectual property, are owned solely by Company Towns Capital LLC.</p>
            </section>

            <section className="mb-4">
                <h2 className="text-2xl font-semibold">3. Corporate Privacy Commitment</h2>
                <p>3.1 Company Towns Capital LLC is committed to maintaining the highest standards of user privacy and data protection.</p>
                <p>3.2 All data handling and processing comply with our corporate privacy policy which is available upon request sent to out company address via print mail and applicable data protection regulations.</p>

            </section>

            <section className="mb-4">
                <h2 className="text-2xl font-semibold">4. Voice Communication</h2>
                <p>4.1 Voice chat is processed through OpenAI's technology with strict privacy safeguards:</p>
                <ul className="list-disc list-inside">
                    <li>No personally identifiable information (PII) is shared with OpenAI</li>
                    <li>Voice data is anonymized before transmission</li>
                    <li>Conversations are not stored permanently</li>
                    <li>Voice interactions are used solely for in-game communication</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2 className="text-2xl font-semibold">5. Data Privacy</h2>
                <p>5.1 We collect and process data as follows:</p>
                <ul className="list-disc list-inside">
                    <li>User account information via Supabase</li>
                    <li>Anonymized gameplay metrics</li>
                    <li>Voice chat data stripped of identifying information</li>
                </ul>
                <p>5.2 We do not sell or share your personal data with third parties beyond necessary game functionality.</p>
            </section>

            <section className="mb-4">
                <h2 className="text-2xl font-semibold">6. Voice Chat Conduct</h2>
                <p>6.1 Users agree to:</p>
                <ul className="list-disc list-inside">
                    <li>Maintain respectful communication</li>
                    <li>Not use offensive, discriminatory, or inappropriate language</li>
                    <li>Not impersonate other players</li>
                    <li>Comply with all applicable laws and game rules</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2 className="text-2xl font-semibold">7. Intellectual Property</h2>
                <p>7.1 All game content, design, and unique features are the property of Towns Capital LLC.</p>
                <p>7.2 Users do not obtain any ownership rights through gameplay.</p>
            </section>

            <section className="mb-4">
                <h2 className="text-2xl font-semibold">8. Limitation of Liability</h2>
                <p>8.1 Suspect is provided "as is" without warranties.</p>
                <p>8.2 We are not liable for:</p>
                <ul className="list-disc list-inside">
                    <li>Interruptions in service</li>
                    <li>Loss of game progress</li>
                    <li>Damages arising from game use</li>
                    <li>Third-party interactions</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2 className="text-2xl font-semibold">9. OpenAI Voice Technology Disclaimer</h2>
                <p>9.1 Voice chat is powered by OpenAI technology but is not endorsed or sponsored by OpenAI.</p>
                <p>9.2 We implement additional privacy layers to protect user identity.</p>
            </section>

            <section className="mb-4">
                <h2 className="text-2xl font-semibold">10. Termination</h2>
                <p>10.1 We reserve the right to terminate accounts for:</p>
                <ul className="list-disc list-inside">
                    <li>Violation of these Terms</li>
                    <li>Fraudulent activity</li>
                    <li>Repeated inappropriate behavior</li>
                    <li>Technical necessities</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2 className="text-2xl font-semibold">11. Modifications</h2>
                <p>11.1 We may update these Terms periodically.</p>
                <p>11.2 Continued use after changes constitutes acceptance of new Terms.</p>
            </section>

            <section className="mb-4">
                <h2 className="text-2xl font-semibold">12. Dispute Resolution</h2>
                <p>12.1 Any disputes shall be resolved through binding arbitration.</p>
                <p>12.2 Governed by the laws of Michigan.</p>
            </section>
            
            <section className="mb-4">
                <h2 className="text-2xl font-semibold">13. Contact Information</h2>
                <p>For questions about these Terms, contact: dennis@dennistowns.com</p>
            </section>

            <p className="mt-6">BY CREATING AN ACCOUNT, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO THESE TERMS OF SERVICE.</p>
            <p className="mt-2">Last Updated: 12/10/2024</p>
            
            </ScrollArea>
        </Card>

    );
};

export default Terms;