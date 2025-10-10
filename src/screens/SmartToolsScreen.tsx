import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Config from "../Config/config";
import Icon from "react-native-vector-icons/MaterialIcons";
import AlertPro from "react-native-alert-pro";

type SmartToolsStackParamList = {
  MarketPrices: undefined;
  LearnToGrow: undefined;
  SmartCropCalendar: undefined;
  ProfitCalculator: undefined;
  Knowledge: undefined;
  SatelliteImaging: undefined;
  Forum: undefined;
  LivestockManagement: undefined;
  PoultryManagement: undefined;
  DiseaseManagement: undefined;
};

type NavigationProp = StackNavigationProp<SmartToolsStackParamList>;

const SmartToolsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const alertRef = React.useRef<AlertPro | null>(null);

  const tools: { 
    name: string; 
    screen: keyof SmartToolsStackParamList;
    icon: string;
    premium: boolean;
  }[] = [
    { name: "Market Prices", screen: "MarketPrices", icon: "local-offer", premium: false },
    { name: "Learn to Grow", screen: "LearnToGrow", icon: "school", premium: false },
    { name: "Smart Crop Calendar", screen: "SmartCropCalendar", icon: "event", premium: false },
    { name: "Profit Calculator", screen: "ProfitCalculator", icon: "calculate", premium: false },
    { name: "Livestock Management", screen: "LivestockManagement", icon: "pets", premium: true },
    // { name: "Poultry Management", screen: "PoultryManagement", icon: "egg", premium: true },
    // { name: "Satellite Imaging & AI Insights", screen: "SatelliteImaging", icon: "satellite", premium: true },
    // { name: "Disease Management", screen: "DiseaseManagement", icon: "coronavirus", premium: false },
    { name: "Knowledge Base", screen: "Knowledge", icon: "newspaper", premium: false },
    { name: "Community Forum", screen: "Forum", icon: "forum", premium: false },
  ];

  const premiumFeatures = [
    "Livestock Management",
    "Poultry Management",
    "Satellite Imaging & AI Insights"
  ];

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("No token");
      const res = await axios.get(`${Config.API_BASE_URL}/subscription/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscription(res.data);
    } catch (err) {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSubscription();
    }, [fetchSubscription])
  );

  const handleToolPress = (featureName: string, screen: string) => {
    if (
      premiumFeatures.includes(featureName) &&
      subscription?.plan !== "premium"
    ) {
      alertRef.current?.open();
      return;
    }
    navigation.navigate(screen as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading your tools...</Text>
      </View>
    );
  }

  if (subscription?.plan === "free_user" && subscription?.status === "inactive") {
    return (
      <View style={styles.expiredContainer}>
        <Icon name="error-outline" size={50} color="#dc3545" style={styles.expiredIcon} />
        <Text style={styles.expiredTitle}>Free Trial Expired</Text>
        <Text style={styles.expiredText}>
          Your free trial period has ended. Subscribe now to continue accessing all AkuafoPlus features.
        </Text>
        <TouchableOpacity 
          style={styles.subscribeButton}
          onPress={() => navigation.navigate("SubscriptionScreen" as never)}
        >
          <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Smart Tools</Text>
          <Text style={styles.headerSubtitle}>
            {subscription ? `Your plan: ${subscription.plan}` : "Select a tool to get started"}
          </Text>
        </View>

        <View style={styles.toolsContainer}>
          {tools.map((tool, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.toolCard,
                tool.premium && subscription?.plan === "free_user" && styles.premiumCard
              ]}
              onPress={() => handleToolPress(tool.name, tool.screen)}
            >
              <View style={styles.toolIconContainer}>
                <Icon name={tool.icon} size={24} color={tool.premium ? "#ffc107" : "#4CAF50"} />
              </View>
              <Text style={styles.toolName}>{tool.name}</Text>
              {tool.premium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {(!subscription || subscription.plan === "free_user") && (
          <TouchableOpacity 
            style={styles.upgradeBanner}
            onPress={() => navigation.navigate("SubscriptionScreen" as never)}
          >
            <View style={styles.upgradeContent}>
              <Icon name="stars" size={24} color="#ffc107" />
              <View style={styles.upgradeTextContainer}>
                <Text style={styles.upgradeTitle}>Unlock Premium Features</Text>
                <Text style={styles.upgradeSubtitle}>Get access to all tools and exclusive content</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
      <AlertPro
        ref={alertRef}
        title="Premium Feature"
        message="Upgrade to Premium to access this feature."
        onConfirm={() => alertRef.current?.close()}
        showCancel={false}
        textConfirm="OK"
        customStyles={{
          mask: { backgroundColor: "rgba(0,0,0,0.4)" },
          container: { borderRadius: 12 }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6c757d",
  },
  header: {
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  toolsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  toolCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumCard: {
    borderWidth: 1,
    borderColor: "#ffc107",
  },
  toolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f1f8e9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  toolName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34495e",
    textAlign: "center",
  },
  premiumBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#ffc107",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  upgradeBanner: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  upgradeContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  upgradeTextContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  upgradeTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  upgradeSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  expiredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: '#f8f9fa',
  },
  expiredIcon: {
    marginBottom: 20,
  },
  expiredTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#dc3545",
    marginBottom: 16,
    textAlign: "center",
  },
  expiredText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  subscribeButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    elevation: 2,
  },
  subscribeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default SmartToolsScreen;