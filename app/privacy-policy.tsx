import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: August 2026</Text>
        <Text style={styles.intro}>
          Love Desire ("we", "us", "our") is a couples intimacy app designed exclusively for use between two consenting adults in a relationship. This Privacy Policy explains how we collect, use, and protect your personal data.
        </Text>

        <Section title="1. Who we are">
          {`Love Desire is operated by Love Desire ehf., a company registered in Iceland.\n\n• Legal entity: Love Desire ehf.\n• Kennitala: [PENDING REGISTRATION]\n• Registered office: [REGISTERED OFFICE ADDRESS]\n• Data controller: Love Desire ehf. is the controller of the personal data processed through the app under GDPR and Icelandic Persónuverndarlög nr. 90/2018.\n• Privacy contact: privacy@lovedesireapp.com\n\nA formal Data Protection Officer is not required for our current scale under GDPR Article 37, but the privacy contact above is the accountable point for all data-protection matters.\n\nThis app is intended exclusively for users aged 18 and older. If you are under 18, please do not use this app.`}
        </Section>

        <Section title="2. Data we collect">
          {`When you use Love Desire, we collect and process the following data:\n\nStandard personal data\n• Account: email address, display name, profile photo, birthday (optional)\n• Couple: relationship start date, shared todos, love notes, memories, important dates, flirt reminders\n• Device: push notification token (used only to deliver partner notifications)\n\nSpecial-category data under GDPR Article 9\nSome features involve data concerning your sex life, sexual orientation, or mental well-being. We treat this as special-category data and process it only with your explicit consent under Article 9(2)(a), which you give in-app when you enable or use the feature:\n• Mood check-ins (including intimate moods such as Kinky and Horny in the paid tier)\n• Sunday Check-in answers and quick-pulse scores (dimensions such as closeness, physical intimacy)\n• Intimacy Log entries (opt-in, per-user private)\n• The Lovers intimacy-type quiz answers and results\n• Fantasy Wishes votes and matches\n• Truth or Dare Spicy content interactions and any user-recorded audio\n\nYou may withdraw consent at any time by disabling the feature in Settings, or by deleting the associated entries. Withdrawal does not affect processing that already took place under valid consent.\n\nTelemetry\n• Aggregated usage counts across all users each month (how often a feature is opened). No identifying information.\n• Per-couple usage sessions (which feature, when, for how long — capped at 5 minutes per opening). Retained for 12 months, then replaced by anonymised aggregates. Used only by Love Desire administrators to improve the service and monitor operational health.\n\nWhat we do NOT collect: location, contacts, browsing history, biometrics, or any data beyond what you explicitly provide.`}
        </Section>

        <Section title="3. How we use your data">
          {`We process personal data for the following purposes, each with a specific legal basis under GDPR Articles 6 and 9:\n\n• Sync content between you and your partner in real time — Contract performance (Art. 6(1)(b))\n• Send push notifications to your partner (mood, spark, matches) — Contract performance (Art. 6(1)(b))\n• Display countdowns, history, and personalised nudges — Contract performance (Art. 6(1)(b))\n• Process special-category data (mood, intimacy log, quiz answers, fantasies) — Explicit consent (Art. 9(2)(a)) obtained when you enable the feature\n• Aggregated and per-couple telemetry to improve the service — Legitimate interests (Art. 6(1)(f)) balanced against your privacy through 12-month retention limit + no third-party sharing + anonymisation. You may object under Article 21 by emailing privacy@lovedesireapp.com; on objection we cease per-couple session collection for your couple.\n• Comply with legal obligations (tax records, law-enforcement requests) — Legal obligation (Art. 6(1)(c))\n\nWe do not use your data for advertising, profiling, automated decision-making with legal effects, machine-learning training, or any purpose beyond operating the app.`}
        </Section>

        <Section title="4. Who can see your data">
          {`Your personal content is only accessible to you and your paired partner. Content you deliberately share (mood, moments, notes, matches, quiz results) becomes visible to your partner from the moment you share; you can no longer control what your partner does with it once shared.\n\nWe do not sell your personal data. We do not share your personal data with third parties for marketing, advertising, or profiling purposes.\n\nLove Desire staff may have technical access to the database infrastructure for operating, maintaining, and securing the service. Access is restricted to authorised personnel, logged, and bound by strict confidentiality obligations. We do not read, access, or use your personal content beyond what is strictly necessary to provide the service or to investigate abuse reports.\n\nThe premium tier includes sensitive sexual content (see §2 special-category processing). This content is stored with the same security controls as all other data and is never shared outside your couple.\n\nWe may disclose your data where required by law, court order, or governmental authority. We will notify you of such requests where permitted by law.`}
        </Section>

        <Section title="5. Third-party services and international transfers">
          {`Love Desire relies on the following processors (sub-processors) to operate:\n\n• Google Firebase (Authentication, Firestore database, Cloud Storage), operated by Google LLC — user accounts, data storage, photo uploads. Firebase data is stored in Google's europe-west1 (Belgium) region where available.\n• Expo Push Notifications, operated by 650 Industries, Inc. — delivering partner notifications. Only your device push token is shared with Expo; your personal content is never transmitted.\n• Apple App Store and Google Play (as applicable) — process in-app subscription payments and provide us with billing status. We do not receive your payment card details.\n\nInternational data transfers\nGoogle and Expo are US-headquartered companies. Personal data transferred outside the European Economic Area is protected by the European Commission's Standard Contractual Clauses (Commission Implementing Decision (EU) 2021/914) and, where applicable, by Google's certification under the EU-US Data Privacy Framework. Firebase provides an EU-based storage region where technically feasible.\n\nOur processors are contractually bound to process your data solely on our behalf under a data processing agreement, and are not permitted to use it for their own purposes.\n\nWe do not use analytics SDKs, advertising networks, tracking tools, or crash-reporting SDKs on the client.`}
        </Section>

        <Section title="6. Data retention">
          {`We retain personal data only for as long as necessary for the purpose it was collected, subject to legal retention obligations:\n\n• Account personal data (name, email, profile photo, birthday) — deleted immediately upon account deletion\n• Shared couple data (memories, todos, notes, moments, matches) — retained until both partners delete their accounts, since ownership is joint\n• Special-category data (mood entries, intimacy log, quiz results, Sunday Check-in answers) — deleted with the associated feature or account\n• Per-couple session telemetry — 12 months, then replaced by anonymised aggregates\n• Aggregated (anonymised) telemetry — retained indefinitely; contains no identifying information\n• Encrypted backups — up to 35 days rolling for disaster recovery\n• Subscription and invoice records — 7 years, as required by the Icelandic Bookkeeping Act nr. 145/1994\n• Authentication logs (sign-in events, security audit) — 30 days\n• Abuse-report records and moderation actions — 24 months, for accountability and legal defence\n\nYou can request deletion of all your data at any time by contacting privacy@lovedesireapp.com. We will comply within 30 days, subject to the legal retention obligations above.`}
        </Section>

        <Section title="7. Your rights">
          {`If you are located in the European Economic Area (which includes Iceland), you have the following rights under GDPR:\n\n• Article 15 — Right of access: request a copy of your personal data\n• Article 16 — Right to rectification: correct inaccurate data\n• Article 17 — Right to erasure ("right to be forgotten"): request deletion of your data\n• Article 18 — Right to restriction: request that we limit processing while a query is resolved\n• Article 20 — Right to data portability: receive your data in a machine-readable, portable format\n• Article 21 — Right to object: object to processing based on legitimate interests (such as our per-couple telemetry)\n• Article 7(3) — Right to withdraw consent: withdraw explicit consent for special-category processing at any time, without affecting processing already carried out\n\nWe do not carry out solely automated decision-making with legal or similarly significant effects, so Article 22 (right against automated decisions) is not engaged.\n\nHow to exercise your rights: email privacy@lovedesireapp.com. We will respond within 30 days.\n\nRight to complain — you also have the right to lodge a complaint with the Icelandic Data Protection Authority:\n\nPersónuvernd\nRauðarárstígur 10\n105 Reykjavík, Iceland\npostur@personuvernd.is\nhttps://personuvernd.is`}
        </Section>

        <Section title="8. Data security and breach notification">
          {`Security measures we take:\n• All data is transmitted over encrypted HTTPS/TLS connections\n• Firestore data is encrypted at rest by Google's infrastructure\n• Firestore security rules enforce per-couple isolation — no user can access another couple's data\n• Passwords are managed by Firebase Authentication and are never stored in plain text\n• Photos are stored in Firebase Storage with per-couple access controls\n• Administrative access is restricted, logged, and subject to confidentiality obligations\n\nDespite these measures, no system is completely secure. Use a strong password and do not share your login credentials.\n\nIn the event of a personal-data breach that is likely to result in a risk to your rights and freedoms, we will notify the Icelandic Data Protection Authority (Persónuvernd) within 72 hours of becoming aware of it, as required by GDPR Article 33. Where the breach is likely to result in a high risk to your rights, we will also inform affected users without undue delay, as required by GDPR Article 34.`}
        </Section>

        <Section title="9. Children's privacy">
          {`Love Desire is not intended for users under the age of 18. We do not knowingly collect data from anyone under 18. We require age confirmation at sign-up, and declining the confirmation deletes the account immediately.\n\nIf you believe a minor has created an account, please contact privacy@lovedesireapp.com and we will delete the account promptly.`}
        </Section>

        <Section title="10. Changes to this policy">
          {`We may update this Privacy Policy from time to time. For non-material changes (clarifications, corrections, contact updates), we will publish the updated policy with a revised "Last updated" date.\n\nFor material changes that affect how we process your special-category data (mood, intimacy log, quiz results, fantasies), we will notify you in-app and by email at least 30 days before the change takes effect, and we will request fresh explicit consent under Article 9(2)(a) before applying the change to your account. If you do not provide fresh consent, the affected feature will be disabled for your account.`}
        </Section>

        <Section title="11. Contact">
          {`For all data-protection matters:\n\nLove Desire ehf.\n[REGISTERED OFFICE ADDRESS]\nKennitala: [PENDING REGISTRATION]\n\n• Privacy questions and data-subject rights: privacy@lovedesireapp.com\n• General support: support@lovedesireapp.com\n• Abuse reports: abuse@lovedesireapp.com\n\nIcelandic Data Protection Authority: Persónuvernd (https://personuvernd.is)`}
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
