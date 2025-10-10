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

type DataUsageAgreementScreenProps = {
  navigation: StackNavigationProp<any>;
};

const DataUsageAgreementScreen = ({ navigation }: DataUsageAgreementScreenProps) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Data Usage Agreement</Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Agreement Overview</Text>
          <Text style={styles.paragraph}>
            By using the AkuafoPlus mobile application, you acknowledge and agree that we may
            collect, process, and use certain personal and usage data to provide and improve
            our services.
          </Text>

          <Text style={styles.sectionTitle}>What Data We Collect</Text>
          <Text style={styles.paragraph}>
            We may collect the following types of data:
            {"\n"}- Account information (name, email, phone number)
            {"\n"}- Location data (if permission is granted)
            {"\n"}- Device and log data (IP address, device type, OS)
            {"\n"}- Usage behavior (features accessed, time spent)
          </Text>

          <Text style={styles.sectionTitle}>Purpose of Data Usage</Text>
          <Text style={styles.paragraph}>
            Your data is used to:
            {"\n"}- Provide core functionality of the app
            {"\n"}- Offer personalized crop and livestock recommendations
            {"\n"}- Ensure security, detect misuse, and resolve issues
            {"\n"}- Analyze usage trends to improve app performance
          </Text>

          <Text style={styles.sectionTitle}>Data Sharing and Disclosure</Text>
          <Text style={styles.paragraph}>
            We do not sell or rent your personal information. We may share data:
            {"\n"}- With service providers under strict confidentiality agreements
            {"\n"}- When required by law or to protect legal rights
            {"\n"}- In anonymized or aggregated form for research and analytics
          </Text>

          <Text style={styles.sectionTitle}>Your Control and Choices</Text>
          <Text style={styles.paragraph}>
            You have the right to:
            {"\n"}- Access and update your personal information
            {"\n"}- Disable location sharing via your device settings
            {"\n"}- Request deletion of your account and associated data
            {"\n"}- Withdraw consent at any time by discontinuing app use
          </Text>

          <Text style={styles.sectionTitle}>Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your data only as long as necessary to fulfill the purposes outlined in
            this agreement, or as required by law.
          </Text>

          <Text style={styles.sectionTitle}>Security Measures</Text>
          <Text style={styles.paragraph}>
            We use appropriate technical and organizational safeguards to protect your data,
            including encryption and secure storage. However, no system is completely immune
            to breaches.
          </Text>

          <Text style={styles.sectionTitle}>Amendments</Text>
          <Text style={styles.paragraph}>
            We may update this Data Usage Agreement periodically. If changes are material,
            we will notify you through the app. Continued use of the app after changes
            implies acceptance of the revised agreement.
          </Text>

          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have questions or concerns about how your data is handled, please contact
            us at: support@agricconnect.org
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
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
    color: "#1F2937",
  },
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: "#FFFFFF",
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
    lineHeight: 24,
    color: "#374151",
    marginBottom: 16,
  },
});

export default DataUsageAgreementScreen;
