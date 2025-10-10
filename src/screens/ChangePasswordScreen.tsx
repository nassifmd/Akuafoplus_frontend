import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Config from "../Config/config";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import Icon from "react-native-vector-icons/Feather";
import AlertPro from "react-native-alert-pro";

type RootStackParamList = {
  LoginScreen: undefined;
};

const ChangePasswordScreen = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const confirmCallback = useRef<(() => void) | null>(null);

  const alertRef = useRef<AlertPro | null>(null);

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const openAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    confirmCallback.current = onConfirm || null;
    alertRef.current?.open();
  };

  // Fetch username/email on mount
  React.useEffect(() => {
    const fetchUserInfo = async () => {
      const storedUsername = await AsyncStorage.getItem("username");
      const storedEmail = await AsyncStorage.getItem("email");
      setUsername(storedUsername || "");
      setEmail(storedEmail || "");
    };
    fetchUserInfo();
  }, []);

  // Password validation rules
  const passwordRules = [
    {
      label: "At least 8 characters",
      test: (pw: string) => pw.length >= 8,
    },
    {
      label: "At least one uppercase letter",
      test: (pw: string) => /[A-Z]/.test(pw),
    },
    {
      label: "At least one lowercase letter",
      test: (pw: string) => /[a-z]/.test(pw),
    },
    {
      label: "At least one number",
      test: (pw: string) => /\d/.test(pw),
    },
    {
      label: "At least one special character",
      test: (pw: string) => /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\;/']/g.test(pw),
    },
    {
      label: "No spaces allowed",
      test: (pw: string) => !/\s/.test(pw),
    },
    {
      label: "Must not match username/email",
      test: (pw: string) =>
        pw &&
        username &&
        email &&
        pw.toLowerCase() !== username.toLowerCase() &&
        pw.toLowerCase() !== email.toLowerCase(),
    },
  ];

  // Helper to check all rules
  const isPasswordValid = (pw: string) =>
    passwordRules.every((rule, idx) =>
      idx === 6
        ? rule.test(pw) // username/email rule
        : rule.test(pw)
    );

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      openAlert("Error", "All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      openAlert("Error", "New passwords don't match");
      return;
    }

    // Check all password rules
    for (let i = 0; i < passwordRules.length; i++) {
      if (!passwordRules[i].test(newPassword)) {
        openAlert("Error", `Password rule not met: ${passwordRules[i].label}`);
        return;
      }
    }

    try {
      setLoading(true);

      const authToken = await AsyncStorage.getItem("accessToken");
      if (!authToken) {
        openAlert("Error", "Authentication required. Please login again.");
        return;
      }

      const response = await axios.post(
        `${Config.API_BASE_URL}/auth/change-password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.data.success) {
        openAlert(
          "Success",
          "Password changed successfully. You will be logged out.",
          async () => {
            await AsyncStorage.removeItem("accessToken");
            navigation.reset({
              index: 0,
              routes: [{ name: "LoginScreen" }],
            });
          }
        );
      } else {
        openAlert("Error", response.data.message || "Failed to change password");
      }
    } catch (error) {
      console.error("Change password error:", error);
      let errorMessage = "An error occurred while changing password";
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      openAlert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    showPassword: boolean,
    setShowPassword: (show: boolean) => void,
    isLast = false
  ) => (
    <View style={[styles.inputContainer, isLast && styles.lastInputContainer]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder={`Enter your ${label.toLowerCase()}`}
          secureTextEntry={!showPassword}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
        >
          <Icon
            name={showPassword ? "eye-off" : "eye"}
            size={22}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Icon name="lock" size={32} color="#2563EB" />
              </View>
            </View>

            <Text style={styles.title}>Update Your Password</Text>
            <Text style={styles.subtitle}>
              For security, your new password should be different from previous
              passwords
            </Text>

            {renderInputField(
              "Current Password",
              currentPassword,
              setCurrentPassword,
              showCurrentPassword,
              setShowCurrentPassword
            )}

            {renderInputField(
              "New Password",
              newPassword,
              setNewPassword,
              showNewPassword,
              setShowNewPassword
            )}

            {renderInputField(
              "Confirm New Password",
              confirmPassword,
              setConfirmPassword,
              showConfirmPassword,
              setShowConfirmPassword,
              true
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handleChangePassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Update Password</Text>
              )}
            </TouchableOpacity>

            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Password must include:</Text>
              {passwordRules.map((rule, idx) => {
                // For username/email rule, show only if username/email loaded
                if (idx === 6 && (!username && !email)) return null;
                const passed = rule.test(newPassword);
                return (
                  <View style={styles.requirementItem} key={rule.label}>
                    <Icon
                      name={passed ? "check-circle" : "x-circle"}
                      size={16}
                      color={passed ? "#10B981" : "#EF4444"}
                    />
                    <Text style={styles.requirementText}>{rule.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AlertPro
        ref={alertRef}
        onConfirm={() => {
          alertRef.current?.close();
          if (confirmCallback.current) {
            const cb = confirmCallback.current;
            confirmCallback.current = null;
            cb();
          }
        }}
        onCancel={() => alertRef.current?.close()}
        showCancel={false}
        title={alertTitle}
        message={alertMessage}
        textConfirm="OK"
        customStyles={{
          mask: { backgroundColor: "rgba(0,0,0,0.5)" },
          container: {
            borderRadius: 16,
            padding: 24,
          },
          title: {
            fontSize: 20,
            fontWeight: "600",
            color: "#1F2937",
          },
          message: {
            fontSize: 16,
            color: "#6B7280",
            textAlign: "center",
          },
          buttonConfirm: {
            backgroundColor: "#2563EB",
            borderRadius: 12,
            paddingVertical: 16,
          },
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  headerRight: {
    width: 40,
  },
  container: {
    flex: 1,
    margin: 20,
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  lastInputContainer: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
  },
  eyeIcon: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
    shadowColor: "transparent",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  passwordRequirements: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
  },
});

export default ChangePasswordScreen;