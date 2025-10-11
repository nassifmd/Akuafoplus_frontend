import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Config from "../Config/config";
import Icon from "react-native-vector-icons/MaterialIcons";
import AlertPro from "react-native-alert-pro";

const API_URL = `${Config.API_BASE_URL}/auth/login`;

interface LoginScreenProps {
  navigation: any;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const alertRef = useRef<any>(null);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string }>({ title: "", message: "" });

  const emailRegex = /^\S+@\S+\.\S+$/;

  const showAlert = useCallback((title: string, message: string) => {
    setAlertConfig({ title, message });
    alertRef.current?.open();
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!email.trim() || !password.trim()) {
      showAlert('Missing Fields', 'Please enter both email and password.');
      return false;
    }

    if (!emailRegex.test(email.trim())) {
      showAlert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }

    return true;
  }, [email, password, showAlert]);

  const storeUserData = async (tokens: { accessToken: string; refreshToken: string }, user: User) => {
    try {
      await AsyncStorage.multiSet([
        ["accessToken", tokens.accessToken],
        ["refreshToken", tokens.refreshToken],
        ["userEmail", user.email],
        ["userId", user.id],
        ["userName", user.name],
        ["userRole", user.role],
      ]);
    } catch (error) {
      console.error("Error storing user data:", error);
      throw new Error("Failed to save login information");
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await axios.post<LoginResponse>(
        API_URL,
        { 
          email: email.toLowerCase().trim(), 
          password: password.trim() 
        },
        {
          timeout: 15000,
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
        }
      );

      const { accessToken, refreshToken, user } = response.data;
      
      if (accessToken && refreshToken && user?.id) {
        await storeUserData({ accessToken, refreshToken }, user);
        
        // Direct navigation without alert - smoother user experience
        navigation.reset({ 
          index: 0, 
          routes: [{ name: "Dashboard" }] 
        });
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      let message = "Login failed. Please try again.";
      let title = 'Login Error';

      if (error.code === 'ECONNABORTED') {
        message = "Request timeout. Please check your internet connection and try again.";
      } else if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        switch (status) {
          case 401:
            message = "Invalid email or password. Please check your credentials and try again.";
            break;
          case 403:
            if (errorData.code === "VERIFICATION_PENDING") {
              message = "Please verify your email before logging in. Check your inbox for the verification link we sent you.";
              title = 'Email Verification Required';
            } else if (errorData.code === "VERIFICATION_EXPIRED") {
              message = "Your verification link has expired. We've sent a new verification email to your inbox.";
              title = 'Verification Link Expired';
            } else if (errorData.code === "VERIFICATION_REQUIRED") {
              message = "Please verify your email to continue. We've sent a new verification email to your inbox.";
              title = 'Verify Your Email';
            } else {
              message = errorData.message || "Access denied. Please contact support.";
            }
            break;
          case 429:
            message = "Too many login attempts. Please wait a few minutes and try again.";
            break;
          case 500:
            message = "We're experiencing technical issues. Please try again in a few minutes.";
            break;
          default:
            message = errorData?.message || message;
        }
      } else if (error.request) {
        message = "Unable to connect. Please check your internet connection and try again.";
      } else {
        message = error.message || message;
      }

      showAlert(title, message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPasswordScreen");
  };

  const handleRegister = () => {
    navigation.navigate("RegisterScreen");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleEmailSubmit = () => {
    // Focus password field or proceed to login
  };

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1 }} 
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back 👋</Text>
          <Text style={styles.subtitle}>Sign in to your account to continue</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={handleEmailSubmit}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity 
                onPress={togglePasswordVisibility}
                disabled={isLoading}
                style={styles.visibilityButton}
              >
                <Icon
                  name={showPassword ? "visibility" : "visibility-off"}
                  size={24}
                  color="#8C735B"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loadingText}>Signing in...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.linksContainer}>
            <TouchableOpacity 
              onPress={handleForgotPassword}
              disabled={isLoading}
            >
              <Text style={[styles.link, isLoading && styles.disabledLink]}>
                Forgot your password?
              </Text>
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity 
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={[styles.linkHighlight, isLoading && styles.disabledLink]}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Error Alert Component */}
        <AlertPro
          ref={alertRef}
          title={alertConfig.title}
          message={alertConfig.message}
          onConfirm={() => {
            alertRef.current?.close();
          }}
          showCancel={false}
          textConfirm="OK"
          customStyles={{
            mask: { backgroundColor: 'rgba(0,0,0,0.5)' },
            container: { 
              borderWidth: 1, 
              borderColor: '#D7CCC8',
              borderRadius: 12,
            },
            buttonConfirm: { 
              backgroundColor: '#388E3C',
              borderRadius: 8,
              paddingVertical: 12,
            },
            title: {
              textAlign: 'center',
              color: '#4E342E',
              fontSize: 18,
              fontWeight: 'bold',
            },
            message: { 
              textAlign: 'center',
              color: '#6D4C41',
              fontSize: 16,
              lineHeight: 20,
            },
            textConfirm: {
              fontWeight: '600',
              fontSize: 16,
            }
          }}
        />
      </KeyboardAvoidingView>
    </ScrollView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F2",
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#4E342E",
    marginBottom: 8,
    fontWeight: "500",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4E342E",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6D4C41",
    textAlign: "center",
    opacity: 0.8,
  },
  input: {
    width: "100%",
    height: 56,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 56,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D7CCC8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: "#4E342E",
  },
  visibilityButton: {
    padding: 4,
  },
  button: {
    width: "100%",
    backgroundColor: "#388E3C",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: "#A5D6A7",
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
  },
  linksContainer: {
    alignItems: "center",
    marginTop: 24,
    gap: 16,
  },
  link: {
    color: "#388E3C",
    fontSize: 16,
    fontWeight: "500",
  },
  disabledLink: {
    opacity: 0.5,
  },
  registerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  registerText: {
    color: "#4E342E",
    fontSize: 16,
  },
  linkHighlight: {
    color: "#388E3C",
    fontSize: 16,
    fontWeight: "600",
  },
});