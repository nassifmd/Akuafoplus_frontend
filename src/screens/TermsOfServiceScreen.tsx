import React from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import type { StackNavigationProp } from "@react-navigation/stack";

type TermsOfServiceScreenProps = {
  navigation: StackNavigationProp<any>;
};

const TermsOfServiceScreen = ({ navigation }: TermsOfServiceScreenProps) => (
  <SafeAreaView style={styles.safeArea}>
    {/* Header */}
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      <Text style={styles.headerText}>Terms of Service</Text>
    </View>

    {/* Scrollable Content */}
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Welcome to Our Terms of Service</Text>

      <Text style={styles.paragraph}>
        These Terms of Service ("Terms") govern your access to and use of the AkuafoPlus mobile application ("App"), developed to support farmers with tools and insights for better crop and livestock management. By using the App, you agree to be bound by these Terms.
      </Text>

      <Text style={styles.paragraph}>
        1. Acceptance of Terms{"\n"}
        By accessing or using AkuafoPlus, you confirm that you have read, understood, and agreed to these Terms. If you do not agree, please do not use the App.
      </Text>

      <Text style={styles.paragraph}>
        2. Eligibility{"\n"}
        You must be at least 13 years old to use this App. By using the App, you confirm that you meet this requirement.
      </Text>

      <Text style={styles.paragraph}>
        3. Use of the App{"\n"}
        AkuafoPlus is intended for personal, non-commercial use. You agree not to misuse the App, including attempting unauthorized access, interfering with the App’s operation, or copying its features for competitive purposes.
      </Text>

      <Text style={styles.paragraph}>
        4. User Accounts{"\n"}
        Some features may require an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.
      </Text>

      <Text style={styles.paragraph}>
        5. Data and Privacy{"\n"}
        Your data is handled according to our Privacy Policy. We collect only the information needed to provide core functionality and improve your farming experience.
      </Text>

      <Text style={styles.paragraph}>
        6. Modifications and Updates{"\n"}
        We may update the App or these Terms at any time. Continued use of the App after changes are made constitutes your acceptance of the new Terms.
      </Text>

      <Text style={styles.paragraph}>
        7. Termination{"\n"}
        We reserve the right to suspend or terminate your access to the App at our discretion, without notice, for any violation of these Terms or misuse of the service.
      </Text>

      <Text style={styles.paragraph}>
        8. Disclaimer and Limitation of Liability{"\n"}
        AkuafoPlus is provided “as is.” We do not guarantee that the App will be free of errors, interruptions, or inaccuracies. We are not liable for any losses arising from your use of the App.
      </Text>

      <Text style={styles.paragraph}>
        9. Contact Us{"\n"}
        If you have questions about these Terms, please contact us at: support@agricconnect.org
      </Text>
    </ScrollView>
  </SafeAreaView>
);

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
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111827",
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: "#374151",
    marginBottom: 16,
  },
});

export default TermsOfServiceScreen;
