import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Config from '../Config/config';
import AlertPro from "react-native-alert-pro"; // Replaced react-native-alert-notification

const API_URL = `${Config.API_BASE_URL}/auth/register-employee`;

const typeColors: Record<string, string> = {
  SUCCESS: "#4CAF50",
  DANGER: "#f44336",
  WARNING: "#ff9800",
  INFO: "#2196f3",
};

const RegisterEmployeeScreen = ({ navigation }: any) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [loading, setLoading] = useState(false);

  // Alert state
  const alertRef = useRef<any>(null);
  const [alertData, setAlertData] = useState({ title: "", message: "", type: "INFO" });

  const showAlert = (type: string, title: string, message: string) => {
    setAlertData({ type, title, message });
    alertRef.current?.open();
  };

  const handleRegisterEmployee = async () => {
    if (!name || !email || !password) {
      showAlert("WARNING", "Validation Error", "Name, email, and password are required.");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const payload = { name, email, phone, password, role };

      const response = await axios.post(API_URL, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.success) {
        showAlert("SUCCESS", "Success", "Employee registered successfully!");
        navigation.goBack();
      } else {
        showAlert("DANGER", "Registration Failed", "Registration failed. Please try again.");
      }
    } catch (error) {
      showAlert(
        "DANGER",
        "Error",
        (error as any).response?.data?.error || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register Employee</Text>
      <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Phone" keyboardType="numeric" value={phone} onChangeText={setPhone} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

      <View style={styles.roleContainer}>
        {["employee", "Farm manager"].map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.roleButton, role === r && styles.roleSelected]}
            onPress={() => setRole(r)}
          >
            <Text style={styles.roleText}>
              {r === "Farm manager" ? "Farm Manager" : "Employee"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegisterEmployee} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
      </TouchableOpacity>

      <AlertPro
        ref={alertRef}
        title={alertData.title}
        message={alertData.message}
        onConfirm={() => alertRef.current?.close()}
        textConfirm="OK"
        customStyles={{
          mask: { backgroundColor: "rgba(0,0,0,0.4)" },
            container: { borderWidth: 2, borderColor: typeColors[alertData.type], paddingVertical: 20, paddingHorizontal: 16, borderRadius: 12 },
          title: { color: typeColors[alertData.type], fontSize: 18, fontWeight: "600" },
          message: { color: "#333", fontSize: 15, marginTop: 8, textAlign: "center" },
          buttonConfirm: { backgroundColor: typeColors[alertData.type] },
          textConfirm: { color: "#fff", fontWeight: "600" },
        }}
      />
    </View>
  );
};

export default RegisterEmployeeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  input: { width: "100%", height: 50, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 10 },
  button: { backgroundColor: "#4CAF50", padding: 15, borderRadius: 8, width: "100%", alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  roleContainer: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginBottom: 10 },
  roleButton: { padding: 10, borderWidth: 1, borderRadius: 5, margin: 5, borderColor: "#aaa" },
  roleSelected: { backgroundColor: "#4CAF50" },
  roleText: { fontSize: 14, color: "#333" },
});