import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from "react-native";
import AlertPro from "react-native-alert-pro";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from "react-native-vector-icons/Ionicons";
import Config from '../Config/config';

import type { StackNavigationProp } from '@react-navigation/stack';

type ContactSupportScreenProps = {
  navigation: StackNavigationProp<any>;
};

const ContactSupportScreen = ({ navigation }: ContactSupportScreenProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const alertRef = useRef<AlertPro | null>(null);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "warning" | "error">("success");

  const openAlert = (title: string, msg: string, type: "success" | "warning" | "error" = "success") => {
    setAlertTitle(title);
    setAlertMessage(msg);
    setAlertType(type);
    alertRef.current?.open();
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        const storedEmail = await AsyncStorage.getItem('userEmail');
        if (storedName) setName(storedName);
        if (storedEmail) setEmail(storedEmail);
      } catch (error) {
        console.warn('Error loading user data', error);
      }
    };

    loadUserData();
  }, []);

  const isValidEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.toLowerCase());
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      openAlert('Missing Information', 'Please fill all fields', 'warning');
      return;
    }

    if (!isValidEmail(email)) {
      openAlert('Invalid Email', 'Please enter a valid email address', 'warning');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const response = await axios.post(`${Config.API_BASE_URL}/send-support-email`, {
        name,
        email,
        message,
      });

      openAlert('Success', response.data.message || "Support request sent!", 'success');
      setMessage("");
    } catch (error: any) {
      console.error("Send support email error:", error);
      const msg = error?.response?.data?.message || "Failed to send support request. Please try again.";
      openAlert('Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Contact Support</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={styles.input}
          placeholder="Your Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
          accessible
          accessibilityLabel="Your Name"
          textContentType="name"
        />

        <TextInput
          style={styles.input}
          placeholder="Your Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
          accessible
          accessibilityLabel="Your Email"
          textContentType="emailAddress"
        />

        <TextInput
          style={[styles.input, styles.messageInput]}
          placeholder="Your Message"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessible
          accessibilityLabel="Your Message"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <AlertPro
        ref={(ref) => { alertRef.current = ref; }}
        onConfirm={() => alertRef.current?.close()}
        title={alertTitle}
        message={alertMessage}
        textConfirm="OK"
        showCancel={false}
        customStyles={{
          container: {
            borderLeftWidth: 6,
            borderLeftColor:
              alertType === 'success'
                ? '#16a34a'
                : alertType === 'warning'
                ? '#f59e0b'
                : '#dc2626',
          },
          buttonConfirm: {
            backgroundColor:
              alertType === 'success'
                ? '#16a34a'
                : alertType === 'warning'
                ? '#f59e0b'
                : '#dc2626',
          },
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 3,
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
  scrollContent: {
    padding: 24,
    justifyContent: "center",
  },
  input: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  messageInput: {
    height: 120,
  },
  button: {
    backgroundColor: "#4a90e2",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#4a90e2",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "#7fbcf6",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default ContactSupportScreen;
