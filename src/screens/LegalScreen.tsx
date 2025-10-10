import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import type { StackNavigationProp } from '@react-navigation/stack';

type LegalScreenProps = {
  navigation: StackNavigationProp<any>;
};

const LegalScreen = ({ navigation }: LegalScreenProps) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal</Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Terms of Service</Text>
        <Text style={styles.paragraph}>
          By using AkuafoPlus, you agree to comply with and be bound by these Terms of Service. 
          You must be at least 13 years old to use this app. You are responsible for maintaining 
          the confidentiality of your account information and for all activities that occur under your account.
        </Text>
        <Text style={styles.paragraph}>
          AkuafoPlus is provided “as is” and “as available.” We do not guarantee that the app 
          will always be secure, error-free, or available. We may modify, suspend, or terminate 
          your access at any time without prior notice.
        </Text>
        <Text style={styles.paragraph}>
          You agree not to misuse the app, reverse engineer it, or use it for unauthorized purposes, 
          including but not limited to data scraping or interfering with its operations.
        </Text>

        <Text style={styles.sectionTitle}>Privacy Policy</Text>
        <Text style={styles.paragraph}>
          Your privacy matters. AkuafoPlus collects minimal personal data necessary to improve your experience, 
          including device info, usage statistics, and optionally, location data to provide localized farming recommendations.
        </Text>
        <Text style={styles.paragraph}>
          We do not sell your data. Your information is stored securely and is only shared with third parties 
          if required by law or for essential services such as cloud storage and analytics.
        </Text>
        <Text style={styles.paragraph}>
          You may request access to or deletion of your personal data at any time by contacting our support team.
        </Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.paragraph}>
          If you have questions about these terms or our privacy policy, please contact us at:
          support@agricconnect.org
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 16,
    color: "#111827",
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    color: "#1F2937",
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: "#4B5563",
  },
});

export default LegalScreen;
