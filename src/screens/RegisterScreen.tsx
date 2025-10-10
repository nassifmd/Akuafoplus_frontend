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
  Platform,
  Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Config from '../Config/config';
import AlertPro from "react-native-alert-pro";

const API_URL = `${Config.API_BASE_URL}/auth/register`;

const RegisterScreen = ({ navigation }: any) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role] = useState("user");
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState(""); // <-- new

  // Added for react-native-alert-pro
  const alertRef = useRef<any>(null);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>('error');

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    // Open modal
    requestAnimationFrame(() => alertRef.current?.open());
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Accepts 0XXXXXXXXX, +233XXXXXXXXX, or 233XXXXXXXXX
    const ghRegex = /^(0\d{9}|233\d{9}|\+233\d{9})$/;
    return ghRegex.test(phone.replace(/\s/g, ''));
  };

  // Helper: Normalize phone to international format
  const normalizePhone = (phone: string): string => {
    let msisdn = phone.replace(/\s/g, '');
    if (msisdn.startsWith("0")) msisdn = "233" + msisdn.slice(1);
    if (msisdn.startsWith("+233")) msisdn = msisdn.replace("+", "");
    return msisdn;
  };

  // Helper: Check supported provider
  const isSupportedProvider = (msisdn: string): boolean => {
    return (
      msisdn.startsWith("23324") ||
      msisdn.startsWith("23354") ||
      msisdn.startsWith("23355") ||
      msisdn.startsWith("23359") ||
      msisdn.startsWith("23323") ||
      msisdn.startsWith("23320") ||
      msisdn.startsWith("23350") ||
      msisdn.startsWith("23327") ||
      msisdn.startsWith("23357")
    );
  };

  const handleRegister = async () => {
    // Trim all inputs
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    // Check for empty fields
    if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedPassword || !trimmedConfirmPassword) {
      showAlert('Missing Information', 'All fields are required. Please fill in all the information.', 'warning');
      return;
    }

    // Name validation
    if (trimmedName.length < 2) {
      showAlert('Invalid Name', 'Name must be at least 2 characters long.', 'warning');
      return;
    }

    const emailLowerCase = trimmedEmail.toLowerCase();

    // Email validation
    if (!validateEmail(emailLowerCase)) {
      showAlert('Invalid Email', 'Please enter a valid email address.', 'warning');
      return;
    }

    // Phone validation
    if (!validatePhone(trimmedPhone)) {
      showAlert('Invalid Phone', 'Please enter a valid phone number.', 'warning');
      return;
    }

    // Password validation
    if (trimmedPassword.length < 6) {
      showAlert('Weak Password', 'Password must be at least 6 characters long.', 'warning');
      return;
    }

    // Password match validation
    if (trimmedPassword !== trimmedConfirmPassword) {
      showAlert('Password Mismatch', 'Passwords do not match. Please make sure both passwords are the same.', 'warning');
      return;
    }

    // Normalize phone
    const normalizedPhone = normalizePhone(trimmedPhone);

    // Check supported provider
    if (!isSupportedProvider(normalizedPhone)) {
      showAlert('Unsupported Provider', 'Please use an MTN, Vodafone, or Tigo number in Ghana.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = { 
        name: trimmedName, 
        email: emailLowerCase, 
        phone: normalizedPhone, 
        password: trimmedPassword, 
        role,
       ...(promoCode ? { promoCode: promoCode.trim() } : {}) // include promoCode when provided
      };

      console.log('Attempting registration with:', { ...payload, password: '[HIDDEN]' });

      const response = await axios.post(API_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      console.log('Registration response:', response.data);

      if (response.data?.message) {
        showAlert('Registration Successful', response.data.message, 'success');
        await AsyncStorage.setItem("userEmail", emailLowerCase);
        
        // Navigate after a short delay to show the success message
        setTimeout(() => {
          navigation.replace("LoginScreen");
        }, 1500);
      } else {
        showAlert('Registration Failed', 'Registration failed. Please try again.');
      }
    } catch (error: any) {
      console.log('Registration error:', error);

      let message = "Registration failed. Please try again.";

      if (error.response) {
        const status = error.response.status;
        if (status === 409 || status === 400) {
          // Check for specific backend messages
          if (
            error.response.data?.message?.toLowerCase().includes("email") &&
            error.response.data?.message?.toLowerCase().includes("exist")
          ) {
            message = "Email already exists. Please use a different email or login.";
          } else if (
            error.response.data?.message?.toLowerCase().includes("phone") &&
            error.response.data?.message?.toLowerCase().includes("exist")
          ) {
            message = "Phone number already exists. Please use a different phone number.";
          } else {
            message = error.response.data?.message || "Invalid registration data. Please check your information.";
          }
        } else {
          message = error.response.data?.message || message;
        }
      } else if (error.code === 'ECONNABORTED') {
        message = "Request timeout. Please check your internet connection.";
      } else if (error.message) {
        message = `Network error: ${error.message}`;
      }

      showAlert('Registration Error', message);
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordInput = (
    value: string,
    setValue: (v: string) => void,
    visible: boolean,
    setVisible: (v: boolean) => void,
    placeholder: string
  ) => (
    <View style={styles.passwordContainer}>
      <TextInput
        style={styles.passwordInput}
        placeholder={placeholder}
        placeholderTextColor="#8C735B"
        secureTextEntry={!visible}
        value={value}
        onChangeText={setValue}
        editable={!loading}
      />
      <TouchableOpacity onPress={() => setVisible(!visible)} disabled={loading}>
        <MaterialIcons
          name={visible ? "visibility" : "visibility-off"}
          size={24}
          color="#8C735B"
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join us today!</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#8C735B"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />
       <TextInput
          style={styles.input}
          placeholder="Referral code (optional)"
          placeholderTextColor="#8C735B"
          value={promoCode}
          onChangeText={setPromoCode}
          editable={!loading}
       />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8C735B"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone"
          placeholderTextColor="#8C735B"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!loading}
        />

        {renderPasswordInput(password, setPassword, showPassword, setShowPassword, "Password")}
        {renderPasswordInput(confirmPassword, setConfirmPassword, showConfirmPassword, setShowConfirmPassword, "Confirm Password")}

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("LoginScreen")} disabled={loading}>
          <Text style={styles.link}>
            Already have an account? <Text style={styles.linkHighlight}>Login</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Added AlertPro component */}
      <AlertPro
        ref={alertRef}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => alertRef.current?.close()}
        showCancel={false}
        textConfirm="OK"
        customStyles={{
          mask: { backgroundColor: 'rgba(0,0,0,0.35)' },
          container: { borderWidth: 0, borderRadius: 16, paddingVertical: 20 },
          title: { fontSize: 18, fontWeight: '600' },
          message: { fontSize: 15, color: '#4E342E' },
          buttonConfirm: {
            backgroundColor:
              alertType === 'success' ? '#388E3C' :
              alertType === 'warning' ? '#FFA000' : '#D32F2F',
            borderRadius: 10,
            paddingHorizontal: 24
          },
          textConfirm: { fontWeight: '600' }
        }}
      />
    </ScrollView>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F2",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 30,
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
    width: "100%",
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7CCC8",
    paddingHorizontal: 16,
    marginBottom: 16,
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
    color: "#4E342E",
    marginTop: 18,
    fontSize: 14,
  },
  linkHighlight: {
    color: "#388E3C",
    fontWeight: "600",
  },
});
