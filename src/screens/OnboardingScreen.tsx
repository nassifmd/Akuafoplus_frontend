import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Onboarding from "react-native-onboarding-swiper";

const logo = require("../assets/logo1.png");

const OnboardingScreen = ({ navigation }: any) => {
  const handleDone = async () => {
    await AsyncStorage.setItem("hasSeenOnboarding", "true");
    navigation.replace("LoginScreen");
  };

  return (
    <Onboarding
      onDone={handleDone}
      onSkip={handleDone}
      containerStyles={{ paddingBottom: 20 }}
      subTitleStyles={styles.subtitle}
      pages={[
        {
          backgroundColor: "#ffffff",
          image: (
            <Image
              source={logo}
              style={{ width: 300, height: 300, resizeMode: "contain" }}
            />
          ),
          title: "",
          subtitle: (
            <Text style={[styles.subtitle, { marginTop: -90 }]}>
              {/* All-in-one guide and tool for smarter crop and livestock farming. */}
            </Text>
          ),
        },
        {
          backgroundColor: "#ffffff",
          image: <Text style={styles.emoji}>📊</Text>,
          title: "Intelligent Analytics",
          subtitle: "Get real-time insights for smart decisions.",
        },
        {
          backgroundColor: "#ffffff",
          image: <Text style={styles.emoji}>🌾</Text>,
          title: "Manage Crops, Livestock & More",
          subtitle: "Plan, track, and optimize your farming activities.",
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#008000",
  },
  subtitle: {
    fontSize: 16,
    color: "#8B4513",
    paddingHorizontal: 20,
    textAlign: "center",
  },
  emoji: {
    fontSize: 60,
  },
});

export default OnboardingScreen;
