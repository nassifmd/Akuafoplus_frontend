import React, { useState, useEffect, useRef } from "react";
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
  Image,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Config from "../Config/config";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { jwtDecode } from "jwt-decode";
import Feather from "react-native-vector-icons/Feather";
import AlertPro from "react-native-alert-pro";

type RootStackParamList = {
  LoginScreen: undefined;
};

type JwtPayload = {
  id?: string;
  _id?: string;
  role?: string;
};

const EditProfileScreen = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null); // <-- Add this line
  const [showPassword, setShowPassword] = useState(false);

  // AlertPro state
  const alertRef = useRef<any>(null);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "danger" | "warning">("success");
  const alertOnConfirm = useRef<(() => void) | null>(null);

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const alertColors: Record<typeof alertType, string> = {
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
  };

  const showAlert = (
    type: "success" | "danger" | "warning",
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    alertOnConfirm.current = onConfirm || null;
    requestAnimationFrame(() => {
      alertRef.current?.open();
    });
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) {
          showAlert("danger", "Authentication Error", "Please log in again.");
          return;
        }

        const response = await axios.get(
          `${Config.API_BASE_URL}/user/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setName(response.data.name || "");
        setEmail(response.data.email || "");
        setPhone(response.data.phone || "");
        setUserRole(response.data.role || "");
        setProfilePicture(response.data.profilePicture || null); // <-- Add this line
      } catch (error) {
        console.error("Fetch profile error:", error);
        showAlert("danger", "Error", "Failed to load user data");
      }
    };

    fetchUserData();
  }, []);

  const toggleShowPassword = () => setShowPassword(!showPassword);

  const handleUpdateProfile = async () => {
    if (!phone) {
      showAlert("warning", "Missing Information", "Phone number is required");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) {
        showAlert("danger", "Authentication Required", "Please log in again.");
        setLoading(false);
        return;
      }

      const decoded = jwtDecode<JwtPayload>(token);
      const userId = decoded.id || decoded._id;
      const role = decoded.role || "";

      if (!userId) {
        showAlert("danger", "Error", "Invalid token: user ID not found");
        setLoading(false);
        return;
      }

      const payload: any = { phone };
      if (role === "Admin" && password.trim() !== "") {
        payload.password = password;
      }

      await axios.put(
        `${Config.API_BASE_URL}/auth/users/${userId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showAlert("success", "Success", "Profile updated successfully", () =>
        navigation.goBack()
      );
    } catch (error) {
      console.error("Update profile error:", error);
      let errorMessage = "An error occurred while updating profile";
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      showAlert("danger", "Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {profilePicture ? (
                  <Image
                    source={{ uri: profilePicture }}
                    style={{ width: 70, height: 70, borderRadius: 35 }}
                  />
                ) : (
                  <Feather name="user" size={40} color="#6366F1" />
                )}
              </View>
              <Text style={styles.welcomeText}>Update your information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Feather name="user" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  placeholder="Full Name"
                  value={name}
                  editable={false}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Feather name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  placeholder="Email Address"
                  value={email}
                  editable={false}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Feather name="phone" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handleUpdateProfile}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Update Profile</Text>
                  <Feather name="check-circle" size={20} color="#fff" style={styles.buttonIcon} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AlertPro
        ref={alertRef}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => {
          alertRef.current?.close();
          if (alertOnConfirm.current) {
            const cb = alertOnConfirm.current;
            alertOnConfirm.current = null;
            cb();
          }
        }}
        showCancel={false}
        textConfirm="OK"
        customStyles={{
          mask: { backgroundColor: "rgba(0,0,0,0.5)" },
          container: { 
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 24,
            borderWidth: 0,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
          },
          buttonConfirm: { 
            backgroundColor: alertColors[alertType],
            borderRadius: 12,
            paddingVertical: 12,
          },
          title: { 
            color: alertColors[alertType], 
            fontWeight: "700",
            fontSize: 18,
            textAlign: "center",
          },
          message: {
            color: "#6B7280",
            textAlign: "center",
            fontSize: 16,
            lineHeight: 24,
          },
          textConfirm: {
            color: "#fff",
            fontWeight: "600",
            fontSize: 16,
          },
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    flex: 1,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#E0E7FF",
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 6,
    color: "#374151",
    fontWeight: "600",
    fontSize: 15,
  },
  subLabel: {
    marginBottom: 12,
    color: "#6B7280",
    fontSize: 13,
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    height: 56,
  },
  disabledInput: {
    color: "#9CA3AF",
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  buttonIcon: {
    marginLeft: 10,
  },
});

export default EditProfileScreen;