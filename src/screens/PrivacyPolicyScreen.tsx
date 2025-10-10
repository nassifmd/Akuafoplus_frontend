import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import type { StackNavigationProp } from "@react-navigation/stack";

type PrivacyPolicyScreenProps = {
  navigation: StackNavigationProp<any>;
};

const PrivacyPolicyScreen = ({ navigation }: PrivacyPolicyScreenProps) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Privacy Policy</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.paragraph}>
            Your privacy is important to us. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use the AkuafoPlus mobile application.
            By using the app, you agree to the practices described in this policy.
          </Text>

          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.paragraph}>
            We may collect the following types of information:
            {"\n"}- Personal identifiers (e.g., name, email, phone number)
            {"\n"}- Device information (e.g., OS version, device model)
            {"\n"}- Usage data (e.g., app activity, feature usage)
            {"\n"}- Location data (only if you grant permission)
          </Text>

          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the collected information to:
            {"\n"}- Improve app functionality and user experience
            {"\n"}- Provide personalized insights and farming recommendations
            {"\n"}- Respond to support requests and technical issues
            {"\n"}- Monitor app performance and prevent misuse
          </Text>

          <Text style={styles.sectionTitle}>Sharing of Information</Text>
          <Text style={styles.paragraph}>
            We do not sell your personal data. We may share data with:
            {"\n"}- Trusted third-party service providers (e.g., cloud hosting, analytics)
            {"\n"}- Law enforcement or regulators, when legally required
          </Text>

          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.paragraph}>
            We implement reasonable security measures to protect your data from unauthorized access,
            disclosure, or alteration. However, no system can be 100% secure.
          </Text>

          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.paragraph}>
            You may request access to, correction of, or deletion of your personal data by contacting us
            at support@akuafo.plus. You may also revoke location or notification permissions at any time
            through your device settings.
          </Text>

          <Text style={styles.sectionTitle}>Children’s Privacy</Text>
          <Text style={styles.paragraph}>
            The app is not intended for children under 13. We do not knowingly collect data from children
            without parental consent.
          </Text>

          <Text style={styles.sectionTitle}>Policy Updates</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy periodically. When we do, we will revise the "Last updated" date
            and notify users where required. Continued use of the app constitutes acceptance of the changes.
          </Text>

          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this Privacy Policy or how your data is handled, please contact us
            at: support@agricconnect.org
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
  },
  backButton: {
    padding: 8,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 12,
    color: "#111827",
  },
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 16,
  },
});

export default PrivacyPolicyScreen;
