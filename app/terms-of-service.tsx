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
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: May 2026</Text>
        <Text style={styles.intro}>
          Please read these Terms of Service carefully before using the Desire app. By creating an account or using Desire, you agree to be bound by these terms.
        </Text>

        <Section title="1. Eligibility">
          {`You must be at least 18 years old to use Desire. By using the app, you confirm that you are 18 or older. Desire contains content of a sexual and intimate nature. If you are under 18, you are not permitted to use this app.\n\nDesire is designed for use between two consenting adults in a romantic relationship. You may not use the app for any other purpose.`}
        </Section>

        <Section title="2. Your account">
          {`You are responsible for maintaining the confidentiality of your login credentials. You are responsible for all activity that occurs under your account.\n\nYou must provide accurate information when creating your account. You may not impersonate another person or create an account on behalf of someone else.\n\nYou may only have one account. Multiple accounts are not permitted.`}
        </Section>

        <Section title="3. Pairing with a partner">
          {`Desire is designed for use between two people who share an invite code to pair their accounts. By pairing with another user, you agree to share certain data with them, including your name, profile photo, mood, and activity within shared features.\n\nYou are responsible for only pairing with someone you trust and have a relationship with. Do not share your invite code publicly.`}
        </Section>

        <Section title="4. Acceptable use">
          {`You agree not to:\n\n• Use Desire for any unlawful purpose\n• Share your account with anyone other than your paired partner\n• Attempt to access another couple's data\n• Reverse engineer, hack, or interfere with the app\n• Use the app to harass, threaten, or harm another person\n• Upload content that is illegal, including content involving minors\n\nWe reserve the right to terminate accounts that violate these terms.`}
        </Section>

        <Section title="5. Premium subscription">
          {`Desire offers a free tier and a paid subscription tier. The premium subscription unlocks additional features including explicit content of a sexual nature.\n\nSubscription fees are charged through the App Store or Google Play. Prices are displayed before purchase. Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date.\n\nRefunds are handled according to the policies of the App Store or Google Play.`}
        </Section>

        <Section title="6. Your content">
          {`You retain ownership of any content you create within Desire, including photos, notes, and messages.\n\nBy uploading content, you grant us a limited licence to store and display that content within the app for the purpose of providing the service. We do not use your content for any other purpose.\n\nYou are responsible for ensuring that any content you upload does not violate any laws or third-party rights.`}
        </Section>

        <Section title="7. Disclaimers">
          {`Desire is provided "as is" without warranties of any kind. We do not guarantee that the app will be available at all times or free from errors.\n\nDesire is not a medical, therapeutic, or professional service. Features such as Sensate Focus and Relationship Pulse are for personal use only and do not constitute professional advice. If you are experiencing serious relationship difficulties, please seek professional support.`}
        </Section>

        <Section title="8. Limitation of liability">
          {`To the maximum extent permitted by law, Desire is not liable for any indirect, incidental, or consequential damages arising from your use of the app.\n\nOur total liability to you for any claim arising from these terms or your use of Desire shall not exceed the amount you paid for the subscription in the 12 months preceding the claim.`}
        </Section>

        <Section title="9. Termination">
          {`You may delete your account at any time from the Profile screen. Upon deletion, your personal data will be removed as described in our Privacy Policy.\n\nWe may suspend or terminate your account if you violate these Terms of Service, with or without notice.`}
        </Section>

        <Section title="10. Changes to these terms">
          {`We may update these Terms of Service from time to time. We will notify you of significant changes through the app. Continued use of Desire after changes constitutes acceptance of the updated terms.`}
        </Section>

        <Section title="11. Governing law">
          {`These terms are governed by the laws of Iceland. Any disputes arising from these terms shall be subject to the jurisdiction of Icelandic courts.`}
        </Section>

        <Section title="12. Contact">
          {`If you have questions about these Terms of Service, contact us at:\n\nolsenis@gmail.com`}
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
