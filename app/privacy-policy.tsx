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
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: May 2026</Text>
        <Text style={styles.intro}>
          Desire ("we", "us", "our") is a couples intimacy app designed exclusively for use between two consenting adults in a relationship. This Privacy Policy explains how we collect, use, and protect your personal data.
        </Text>

        <Section title="1. Who we are">
          {`Desire is an independent app. By using Desire, you agree to this Privacy Policy. This app is intended for users aged 18 and older. If you are under 18, please do not use this app.`}
        </Section>

        <Section title="2. Data we collect">
          {`When you use Desire, we collect and store the following data:\n\n• Account data: email address, display name, profile photo\n• Couple data: your relationship start date, shared todos, moods, memories, love notes, countdowns, flirt reminders\n• Game and activity data: answers to questions, activity card history, relationship pulse scores, intimacy log entries (if enabled)\n• Communication data: sparks sent to your partner, photos shared in memories\n• Device data: push notification token (for sending notifications to your partner)\n• Birthday (optional, day/month/year)\n\nWe do not collect location data, contacts, or any data beyond what you explicitly provide.`}
        </Section>

        <Section title="3. How we use your data">
          {`Your data is used exclusively to provide the features of the app:\n\n• To connect you with your partner and sync shared content in real time\n• To send notifications to your partner on your behalf (e.g. when you log a mood or send a spark)\n• To show countdowns, streaks, and history within the app\n• To personalise your experience (e.g. using your birthday to display your partner's countdown)\n\nWe do not use your data for advertising, profiling, or any purpose beyond operating the app.`}
        </Section>

        <Section title="4. Who can see your data">
          {`Your personal content is only accessible to you and your paired partner.\n\nWe do not sell your personal data. We do not share your personal data with third parties for marketing, advertising, or profiling purposes.\n\nDesire staff may have technical access to the database infrastructure for the purpose of operating, maintaining, and securing the service. All such access is restricted to authorised personnel who require it to perform their role, and all personnel are bound by strict confidentiality obligations. We do not read, access, or use your personal content beyond what is necessary to provide the service.\n\nWe may disclose your data if required to do so by law, court order, or governmental authority. We will notify you of such a request where permitted by law.\n\nThe premium tier includes sensitive sexual content. This content is stored with the same security controls as all other data and is never shared outside your couple.`}
        </Section>

        <Section title="5. Third-party services">
          {`Desire uses the following third-party services to operate:\n\n• Google Firebase (Authentication, Firestore database, Cloud Storage) — for user accounts, data storage, and photo uploads. Firebase processes data on our behalf and is bound by data processing agreements. Firebase is GDPR compliant.\n• Expo Push Notifications — for delivering partner notifications. Only your device push token is shared with Expo; your personal content is never transmitted.\n\nThese service providers are not permitted to use your data for their own purposes. We do not use analytics SDKs, advertising networks, or tracking tools.`}
        </Section>

        <Section title="6. Data retention">
          {`Your data is retained only for as long as necessary to provide the service.\n\n• Account deletion: your personal data (name, email, profile photo, birthday) is deleted immediately upon account deletion.\n• Shared couple data (memories, todos, notes, etc.) may persist until your partner also removes their account, as this data is jointly owned. You may request deletion of all data by contacting us.\n• We retain certain data for longer periods where required by law or for legitimate security purposes (e.g. fraud prevention).\n\nYou can request deletion of all your data at any time by contacting us at the email below.`}
        </Section>

        <Section title="7. Your rights (GDPR)">
          {`If you are located in the European Economic Area, you have the following rights:\n\n• Right to access: request a copy of your data\n• Right to rectification: correct inaccurate data\n• Right to erasure: request deletion of your data\n• Right to data portability: receive your data in a portable format\n• Right to object: object to processing of your data\n\nTo exercise any of these rights, contact us at the email address below. We will respond within 30 days.`}
        </Section>

        <Section title="8. Data security">
          {`We take security seriously:\n\n• All data is transmitted over encrypted HTTPS connections\n• Firestore security rules ensure only your couple can access your data\n• Passwords are managed by Firebase Authentication and are never stored in plain text\n• Photos are stored in Firebase Storage with access controls\n\nDespite these measures, no system is completely secure. Please use a strong password and keep your login credentials private.`}
        </Section>

        <Section title="9. Children's privacy">
          {`Desire is not intended for users under the age of 18. We do not knowingly collect data from anyone under 18. If you believe a minor has created an account, please contact us and we will delete the account promptly.`}
        </Section>

        <Section title="10. Changes to this policy">
          {`We may update this Privacy Policy from time to time. We will notify you of significant changes through the app. Continued use of Desire after changes constitutes acceptance of the updated policy.`}
        </Section>

        <Section title="11. Contact">
          {`If you have questions, concerns, or requests regarding your privacy, please contact us at:\n\nolsenis@gmail.com`}
        </Section>

        <Text style={styles.footer}>© 2026 Desire App. All rights reserved.</Text>
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
