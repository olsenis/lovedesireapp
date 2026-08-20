import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing } from '../constants/spacing';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

export default function TermsOfServiceScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: August 2026</Text>
        <Text style={styles.intro}>
          Please read these Terms of Service carefully before using the Love Desire app. Love Desire is operated by Love Desire ehf., a company registered in Iceland (kt. [PENDING REGISTRATION], registered office in Iceland). By creating an account or using Love Desire, you agree to be bound by these terms.
        </Text>

        <Section title="1. Eligibility">
          {`You must be at least 18 years old to use Love Desire. By using the app, you confirm that you are 18 or older. Love Desire contains content of a sexual and intimate nature.\n\nLove Desire is designed for use between two consenting adults in a romantic relationship. You may not use the app for any other purpose.\n\nYou are also responsible for ensuring that use of Love Desire, including any explicit content in the premium tier, is lawful in your jurisdiction. We may block or terminate access from regions where the service cannot be lawfully offered.`}
        </Section>

        <Section title="2. Your account">
          {`You are responsible for maintaining the confidentiality of your login credentials. You are responsible for all activity that occurs under your account. Notify us promptly at support@lovedesireapp.com if you suspect unauthorised access.\n\nYou must provide accurate information when creating your account. You may not impersonate another person or create an account on behalf of someone else.\n\nYour account is personal and non-transferable. You may only have one account. Multiple accounts are not permitted.`}
        </Section>

        <Section title="3. Pairing with a partner">
          {`Love Desire is designed for use between two people who share an invite code to pair their accounts. By pairing, you agree to share certain data with your partner, including your name, profile photo, mood, and activity within shared features.\n\nExplicit consent for special-category data. When you use features that involve information about your sex life, sexual orientation, or intimate preferences (mood check-ins, intimacy log, Fantasy Wishes, The Lovers quiz, Sunday Check-in, Spicy content), you give your explicit consent under GDPR Article 9(2)(a) for us to process that data for the sole purpose of operating the shared features you enable with your partner. You may withdraw consent at any time by disabling the feature in Settings, unpairing, or deleting your account. See the Privacy Policy for details.\n\nContent shared with your partner cannot be un-shared once your partner has seen it. Be thoughtful about what you share.\n\nYou may unpair at any time by tapping 'Disconnect from partner' in Profile. On unpair, shared couple content is hidden from both partners' timelines. Each user retains their own private data (mood history, intimacy log entries, quiz results). You may then re-pair with a different partner using a fresh invite code.\n\nYou are responsible for only pairing with someone you trust and have a relationship with. Do not share your invite code publicly.`}
        </Section>

        <Section title="4. Acceptable use">
          {`You agree not to:\n\n• Use Love Desire for any unlawful purpose\n• Share your account with anyone other than your paired partner\n• Attempt to access another couple's data\n• Reverse engineer, hack, or interfere with the app or its infrastructure\n• Use the app to harass, threaten, coerce, or harm another person (including your paired partner)\n\nZero-tolerance content policy. You may not upload, share, or attempt to share:\n• Any content depicting or sexualising minors, including AI-generated or synthetic depictions (CSAM)\n• Non-consensual intimate imagery ("revenge porn"), regardless of who created it\n• Content that violates any applicable law\n\nWe report suspected CSAM and other criminal content to relevant authorities. In Iceland this is Ríkislögreglustjórinn (National Commissioner of the Icelandic Police, cyber crime unit), and internationally we report through NCMEC channels. We cooperate with lawful law-enforcement requests.\n\nReporting. To report content that violates these terms, including CSAM, non-consensual imagery, or harassment, email abuse@lovedesireapp.com. We aim to review reports within 24 hours and take proportionate action, which may include content removal, temporary suspension, or permanent termination.\n\nWe reserve the right to remove content and suspend or terminate accounts that violate these terms.`}
        </Section>

        <Section title="5. Premium subscription">
          {`Love Desire offers a free tier and a paid subscription tier. The premium subscription unlocks additional features including explicit content of a sexual nature.\n\nPricing and VAT. Prices are $9.99 per month or $59.99 per year, or the local currency equivalent shown at the point of purchase. Prices displayed to consumers in Iceland and the EEA include VAT (Icelandic VSK where applicable). Apple and Google collect the applicable VAT for App Store and Play Store purchases; for direct-website Android sales we collect and remit VAT ourselves.\n\nAuto-renewal. Subscriptions renew automatically at the same price until cancelled. You can cancel at any time; cancellations take effect at the end of the current billing period, and you retain access to premium features until then.\n\nHow to manage or cancel:\n• iOS, open Settings → your Apple ID → Subscriptions, and cancel at least 24 hours before renewal (Apple's requirement).\n• Android (direct-website purchase), email support@lovedesireapp.com to cancel or request a refund.\n\nEU/EEA 14-day right of withdrawal. Under Icelandic Act nr. 16/2016 on distance and off-premises contracts (implementing EU Directive 2011/83/EU), consumers in the EEA have a 14-day right of withdrawal from the date of purchase for digital services purchased directly from us (Android direct-website sales). By starting to use premium features within this 14-day period, you expressly consent to immediate performance of the service and acknowledge that you thereby lose the right of withdrawal for the digital content that has been supplied. Purchases made through the Apple App Store are governed by Apple's own refund policy.\n\nOne subscription covers both partners in a paired couple. If either partner subscribes, both partners receive the premium features. If you disconnect from your partner, the subscription follows the account that purchased it; the non-purchasing partner reverts to the free tier.\n\nPrice changes. We will notify you at least 30 days in advance of any price change, and the change will take effect on the next renewal after your acceptance. If you do not accept, you may cancel before the change takes effect.\n\nOnline Dispute Resolution. For EU/EEA consumers, an online dispute-resolution platform is available at https://ec.europa.eu/consumers/odr under EU Regulation 524/2013.\n\nRefunds outside the 14-day right are handled by Apple for App Store purchases (per Apple's policy) and by us for direct-website Android purchases (email support@lovedesireapp.com).`}
        </Section>

        <Section title="6. Your content">
          {`You retain ownership of any content you create within Love Desire, including photos, notes, audio recordings, and messages.\n\nBy uploading content, you grant Love Desire ehf. a limited, non-exclusive, royalty-free licence to host, store, transmit, display, back up, and make technical modifications (such as resizing images or transcoding audio) as necessary to operate the service. This licence ends when you delete the content or your account, except that encrypted backups may persist for up to 35 days after deletion for disaster-recovery purposes, after which they are purged. We do not use your content for any other purpose, including but not limited to marketing, advertising, machine-learning training, or resale.\n\nWe collect aggregated usage counts (for example, how many times a feature is opened each month across all users) to help us improve the app. We also collect per-couple session data (which feature you use, when, and for how long, capped at 5 minutes per opening), retained for 12 months and then replaced by anonymised aggregates. This data is used only by Love Desire administrators to improve the service and monitor operational health, and is never sold or shared with third parties for marketing or advertising purposes. Sub-processors such as Google Firebase process this data on our behalf under a data-processing agreement. See the Privacy Policy for details.\n\nYou are solely responsible for any content you upload. You represent and warrant that you have the necessary rights to upload the content, that it does not infringe third-party copyright, and that it does not contain personal data of anyone other than you and your paired partner. You may not upload any content depicting or sexualising minors under any circumstances (see also §4 Acceptable Use). We reserve the right to remove content and terminate accounts that violate these terms.\n\nReporting and moderation. To report content that violates these terms, email abuse@lovedesireapp.com. We aim to review reports within 24 hours and take proportionate action.`}
        </Section>

        <Section title="7. Disclaimers">
          {`Love Desire is provided "as is" and "as available", without warranties of any kind. We do not guarantee that the app will be available at all times or free from errors or interruptions.\n\nLove Desire is not a medical, therapeutic, or professional service. Features such as Presence (slow-touch practice) and the Sunday Check-in pulse are for personal use only and do not constitute professional advice. If you are experiencing serious relationship difficulties, please seek professional support.\n\nStatutory rights are preserved. Nothing in this section limits or excludes statutory rights that consumers have under Icelandic Act nr. 118/2021 on digital content and digital services, Icelandic Consumer Rights Act nr. 121/1994, or other mandatory consumer-protection law. Where such rights apply, they prevail over the "as is" disclaimer above.`}
        </Section>

        <Section title="8. Limitation of liability">
          {`To the maximum extent permitted by law, Love Desire ehf. is not liable for any indirect, incidental, consequential, or special damages arising from your use of the app.\n\nFor users who have paid a subscription fee, our aggregate liability for any claim arising from these terms or your use of Love Desire shall not exceed the greater of (a) the amount you paid for the subscription in the 12 months preceding the claim, or (b) ISK 15,000. For users who have not paid a subscription fee in that period, our aggregate liability is limited to ISK 15,000.\n\nNothing in these terms excludes or limits our liability for:\n• death or personal injury caused by our negligence;\n• fraud or fraudulent misrepresentation;\n• gross negligence or wilful misconduct;\n• damages arising under Article 82 of GDPR; or\n• any other liability that cannot be excluded or limited under Icelandic law.`}
        </Section>

        <Section title="9. Termination">
          {`You may delete your account at any time from the Profile screen. Upon deletion, your personal data will be removed as described in our Privacy Policy, subject to legal retention obligations (for example, subscription invoice records must be retained for 7 years under the Icelandic Bookkeeping Act nr. 145/1994).\n\nWe may suspend or terminate your account for material breach of these Terms of Service. Where reasonably possible we will give you notice and an opportunity to remedy the breach. For serious breaches (including illegal content, fraud, or repeated abuse-report violations) we may act immediately without prior notice.\n\nOn termination for cause, no refund is due. On termination without cause by us, we will refund any unused portion of a paid subscription on a pro-rata basis.\n\nWhere you are one partner of a paired couple and only your account is terminated, your partner retains access to their own account and to the shared couple content until they also delete their account.`}
        </Section>

        <Section title="10. Changes to these terms">
          {`We may update these Terms of Service from time to time. For non-material changes (typos, clarifications, contact updates), we will publish the updated terms with a revised "Last updated" date.\n\nFor material changes, including changes to price, cancellation policy, feature reductions, or the licence you grant under §6, we will notify you in-app and by email at least 30 days before the change takes effect. If you do not agree with a material change, you may cancel your subscription and delete your account before the change takes effect. Continued use of Love Desire after the effective date constitutes acceptance of the updated terms.`}
        </Section>

        <Section title="11. Governing law">
          {`These terms are governed by the laws of Iceland. Any disputes arising from these terms shall be subject to the jurisdiction of Icelandic courts. Love Desire ehf. (kt. [PENDING REGISTRATION]) is the legal entity responsible for the Love Desire app and service.\n\nConsumer forum preservation. If you are a consumer resident in the EU or EEA, this choice of law and forum does not deprive you of the protection of mandatory provisions of the law of your country of residence, and you retain the right to bring proceedings in the courts of your habitual residence.\n\nDispute resolution. Please first contact us at support@lovedesireapp.com so we can try to resolve any complaint informally. EU and EEA consumers may also use the Online Dispute Resolution platform at https://ec.europa.eu/consumers/odr, established under EU Regulation 524/2013.`}
        </Section>

        <Section title="12. Contact">
          {`Love Desire ehf.\n[REGISTERED OFFICE ADDRESS]\nKennitala: [PENDING REGISTRATION]\nVSK-nr: [VSK-NR PENDING]\n\n• General support: support@lovedesireapp.com\n• Privacy and data-protection: privacy@lovedesireapp.com\n• Abuse and content reports: abuse@lovedesireapp.com\n\nSupervisory authorities in Iceland:\n• Data protection: Persónuvernd (https://personuvernd.is)\n• Consumer protection: Neytendastofa (https://neytendastofa.is)`}
        </Section>

        <Text style={styles.footer}>© 2026 Love Desire. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.burgundy },

  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.lg, gap: Spacing.lg },
  updated: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },
  intro: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 22 },

  section: { gap: Spacing.sm },
  sectionTitle: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },
  sectionBody: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 22 },

  footer: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, textAlign: 'center', marginTop: Spacing.md },
});
