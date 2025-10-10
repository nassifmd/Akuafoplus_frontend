import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import type { StackNavigationProp } from "@react-navigation/stack";

// Enable layout animation on Android
if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type LegalScreenProps = {
  navigation: StackNavigationProp<any>;
};

type FAQItemProps = {
  question: string;
  answer: string;
  icon: string;
  isOpen: boolean;
  onPress: () => void;
};

const FAQItem = ({ question, answer, icon, isOpen, onPress }: FAQItemProps) => (
  <View style={styles.card}>
    <TouchableOpacity onPress={onPress} style={styles.cardHeader}>
      <View style={styles.iconContainer}>
        <Icon name={icon} size={20} color="#3B82F6" />
      </View>
      <Text style={styles.question}>{question}</Text>
      <Icon
        name={isOpen ? "chevron-up" : "chevron-down"}
        size={20}
        color="#6B7280"
      />
    </TouchableOpacity>
    {isOpen && <Text style={styles.answer}>{answer}</Text>}
  </View>
);

const FAQScreen = ({ navigation }: LegalScreenProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      icon: "lock-closed-outline",
      question: "How do I reset my password?",
      answer:
        "Go to Settings > Account > Reset Password and follow the instructions. A link will be sent to your email.",
    },
    {
      icon: "cloud-offline-outline",
      question: "Can I use the app offline?",
      answer:
        "Yes, most features work offline. However, syncing data and real-time updates need a connection.",
    },
    {
      icon: "shield-checkmark-outline",
      question: "Is my data secure?",
      answer:
        "We use end-to-end encryption and secure infrastructure to protect your data.",
    },
  ];

  const toggleOpen = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ</Text>
      </View>

      {/* FAQ Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {faqs.map((faq, index) => (
          <FAQItem
            key={index}
            question={faq.question}
            answer={faq.answer}
            icon={faq.icon}
            isOpen={openIndex === index}
            onPress={() => toggleOpen(index)}
          />
        ))}
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
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 1,
  },
  backButton: {
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 24,
    alignItems: "center",
    marginRight: 12,
  },
  question: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  answer: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "#4B5563",
    paddingLeft: 36,
  },
});

export default FAQScreen;
