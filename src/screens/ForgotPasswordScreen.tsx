import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import axios from "axios";
import AlertPro from "react-native-alert-pro";
import Config from "../Config/config";

const API_URL = `${Config.API_BASE_URL}/auth/request-password-reset`;

const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const alertRef = useRef<any>(null);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertKind, setAlertKind] = useState<"success" | "error" | "warning">("success");

  const showAlert = (
    kind: "success" | "error" | "warning",
    title: string,
    message: string,
    autoCloseMs?: number
  ) => {
    setAlertKind(kind);
    setAlertTitle(title);
    setAlertMessage(message);
    requestAnimationFrame(() => alertRef.current?.open());
    if (autoCloseMs) {
      setTimeout(() => alertRef.current?.close(), autoCloseMs);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      showAlert("warning", "Error", "Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(API_URL, { email });
      showAlert(
        "success",
        "Success",
        response.data.message || "Reset link sent to your email.",
        2000
      );
      navigation.goBack();
    } catch (error) {
      console.error("Password Reset Error:", error);
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || "Something went wrong. Try again."
        : "Something went wrong. Try again.";
      showAlert("error", "Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const kindColors = {
    success: "#388E3C",
    error: "#D32F2F",
    warning: "#F57C00",
  };
  const accent = kindColors[alertKind];

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your registered email below to receive password reset instructions.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#8C735B"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handlePasswordReset}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={styles.link}>Back to Login</Text>
        </TouchableOpacity>

        <AlertPro
          ref={alertRef}
          title={alertTitle}
          message={alertMessage}
          onConfirm={() => alertRef.current?.close()}
          showCancel={false}
          textConfirm="OK"
          customStyles={{
            container: {
              borderWidth: 2,
              borderColor: accent,
              paddingVertical: 20,
            },
            buttonConfirm: {
              backgroundColor: accent,
            },
            title: {
              color: accent,
              fontWeight: "700",
            },
            message: {
              textAlign: "center",
            },
          }}
        />
      </KeyboardAvoidingView>
    </ScrollView>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F2",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4E342E",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "#6D4C41",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D7CCC8",
    fontSize: 16,
    color: "#4E342E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    width: "100%",
    backgroundColor: "#388E3C",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: "#A5D6A7",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  link: {
    color: "#6D4C41",
    marginTop: 18,
    fontSize: 14,
  },
});