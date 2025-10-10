import React, { useState, useRef } from "react";
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
import { ALERT_TYPE, Dialog, Toast } from 'react-native-alert-notification';
import AlertPro from "react-native-alert-pro";

const API_URL = `${Config.API_BASE_URL}/auth/login`;

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const alertRef = useRef<any>(null);
  const actionRef = useRef<(() => void) | null>(null);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string }>({ title: "", message: "" });

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertConfig({ title, message });
    actionRef.current = onConfirm || null;
    alertRef.current?.open();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showAlert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        API_URL,
        { email, password },
        {
          timeout: 10000,
          headers: { "Content-Type": "application/json" },
        }
      );

      const { accessToken, refreshToken, user } = response.data;
      if (accessToken && refreshToken) {
        await AsyncStorage.multiSet([
          ["accessToken", accessToken],
          ["refreshToken", refreshToken],
          ["userEmail", email],
          ["userId", user?.id || user?._id || ''], // Store userId from response
        ]);

        navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      let message = "Login failed. Please try again.";
      if (error.response) {
        if (error.response.status === 401) {
          message = "Invalid email or password.";
        } else if (error.response.status === 403) {
          message = "Please verify your email before logging in.";
        } else {
          message = error.response.data?.message || message;
        }
      } else if (error.message) {
        message = `Network error: ${error.message}`;
      }

      showAlert('Login Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <Text style={styles.title}>Welcome Back 👋</Text>
        <Text style={styles.subtitle}>Login to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8C735B"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#8C735B"
            secureTextEntry={!showPassword}
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Icon
              name={showPassword ? "visibility" : "visibility-off"}
              size={24}
              color="#8C735B"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("ForgotPasswordScreen")}>
          <Text style={styles.link}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("RegisterScreen")}>
          <Text style={styles.registerLink}>
            Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text>
          </Text>
        </TouchableOpacity>

        {/* AlertPro component */}
        <AlertPro
          ref={alertRef}
          title={alertConfig.title}
          message={alertConfig.message}
          onConfirm={() => {
            alertRef.current?.close();
            actionRef.current?.();
            actionRef.current = null;
          }}
          onCancel={() => {
            alertRef.current?.close();
            actionRef.current = null;
          }}
          showCancel={false}
          textConfirm="OK"
          customStyles={{
            mask: { backgroundColor: 'rgba(0,0,0,0.25)' },
            container: { borderWidth: 1, borderColor: '#D7CCC8' },
            buttonConfirm: { backgroundColor: '#388E3C' },
            message: { textAlign: 'center' },
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
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4E342E",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "#6D4C41",
    marginBottom: 24,
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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 50,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
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
  registerLink: {
    color: "#4E342E",
    marginTop: 12,
    fontSize: 14,
  },
  linkHighlight: {
    color: "#388E3C",
    fontWeight: "600",
  },
});