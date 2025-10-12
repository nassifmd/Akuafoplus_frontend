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
  SubscriptionScreen: undefined;
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
    // { name: "Poultry Management", screen: "PoultryManagement", icon: "emoji-nature", premium: true },
    // { name: "Satellite Imaging & AI Insights", screen: "SatelliteImaging", icon: "satellite", premium: true },
    // { name: "Disease Management", screen: "DiseaseManagement", icon: "health-and-safety", premium: true },
    { name: "Knowledge Base", screen: "Knowledge", icon: "newspaper", premium: false },
    { name: "Community Forum", screen: "Forum", icon: "forum", premium: false },
  ];

  const premiumFeatures = [
    "Livestock Management",
    "Poultry Management",
    "Satellite Imaging & AI Insights"
  ];

  // Check if user has premium access
  const hasPremiumAccess = useCallback(() => {
    if (!subscription) return false;
    
    if (subscription.status === 'active' && (subscription.plan === 'premium' || subscription.plan === 'basic')) {
      return true;
    }
    
    if (subscription.plan === 'free_trial' && subscription.status === 'trial') {
      const now = new Date();
      if (subscription.endDate && new Date(subscription.endDate) > now) {
        return true;
      }
    }
    
    return false;
  }, [subscription]);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) {
        setSubscription({ 
          plan: "free_user", 
          status: "inactive" 
        });
        return;
      }
      
      const res = await axios.get(`${Config.API_BASE_URL}/subscription/status-frontend`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      
      setSubscription(res.data);
    } catch (err: any) {
      setSubscription({
        plan: "free_user",
        status: "inactive"
      });
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
    if (premiumFeatures.includes(featureName) && !hasPremiumAccess()) {
      alertRef.current?.open();
      return;
    }
    
    navigation.navigate(screen as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Loading your tools...</Text>
      </View>
    );
  }

  if (subscription?.plan === "free_user" && subscription?.status === "inactive") {
    return (
      <View style={styles.expiredContainer}>
        <View style={styles.expiredIconContainer}>
          <Icon name="error-outline" size={50} color="#e74c3c" />
        </View>
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

  const userHasPremium = hasPremiumAccess();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Smart Tools</Text>
          <Text style={styles.headerSubtitle}>
            {subscription ? `Your plan: ${subscription.plan === "free_trial" ? "Free Trial" : subscription.plan}` : "Select a tool to get started"}
          </Text>
          
          <View style={styles.badgeContainer}>
            {subscription?.plan === "free_trial" && subscription?.status === "trial" && (
              <View style={styles.trialBadge}>
                <Icon name="timer" size={16} color="#fff" />
                <Text style={styles.trialText}>Free Trial Active</Text>
              </View>
            )}
            {userHasPremium && (
              <View style={styles.premiumBadgeHeader}>
                <Icon name="star" size={16} color="#fff" />
                <Text style={styles.premiumBadgeTextHeader}>Premium Active</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.toolsContainer}>
          {tools.map((tool, index) => {
            const isPremiumLocked = tool.premium && !userHasPremium;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.toolCard,
                  isPremiumLocked && styles.premiumCard
                ]}
                onPress={() => handleToolPress(tool.name, tool.screen)}
                disabled={isPremiumLocked}
              >
                <View style={[
                  styles.toolIconContainer,
                  isPremiumLocked && styles.lockedIconContainer
                ]}>
                  <Icon 
                    name={tool.icon} 
                    size={24} 
                    color={isPremiumLocked ? "#bdc3c7" : "#27ae60"} 
                  />
                </View>
                <Text style={[
                  styles.toolName,
                  isPremiumLocked && styles.lockedToolName
                ]}>
                  {tool.name}
                </Text>
                {tool.premium && (
                  <View style={[
                    styles.premiumBadge,
                    isPremiumLocked && styles.premiumBadgeLocked
                  ]}>
                    <Icon name="star" size={12} color="#fff" />
                    <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                  </View>
                )}
                {isPremiumLocked && (
                  <View style={styles.lockedOverlay}>
                    <Icon name="lock" size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {!userHasPremium && (
          <TouchableOpacity 
            style={styles.upgradeBanner}
            onPress={() => navigation.navigate("SubscriptionScreen" as never)}
          >
            <View style={styles.upgradeContent}>
              <View style={styles.upgradeIcon}>
                <Icon name="rocket-launch" size={24} color="#fff" />
              </View>
              <View style={styles.upgradeTextContainer}>
                <Text style={styles.upgradeTitle}>Unlock Premium Features</Text>
                <Text style={styles.upgradeSubtitle}>
                  {subscription?.plan === "free_trial" 
                    ? "Upgrade to keep access after trial ends" 
                    : "Get access to all premium tools and exclusive content"
                  }
                </Text>
              </View>
              <Icon name="arrow-forward" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
      
      <AlertPro
        ref={alertRef}
        title="Premium Feature"
        message="Upgrade to Premium to access this feature. Get access to Livestock Management, Poultry Management, and Satellite Imaging & AI Insights."
        onConfirm={() => {
          alertRef.current?.close();
          navigation.navigate("SubscriptionScreen" as never);
        }}
        showCancel={true}
        textConfirm="Upgrade Now"
        textCancel="Maybe Later"
        onCancel={() => alertRef.current?.close()}
        customStyles={{
          mask: { backgroundColor: "rgba(0,0,0,0.6)" },
          container: { 
            borderRadius: 20,
            padding: 24,
            margin: 20
          },
          title: {
            fontSize: 22,
            fontWeight: '700',
            color: '#2c3e50',
            textAlign: 'center',
            marginBottom: 12
          },
          message: {
            fontSize: 16,
            color: '#5d6d7e',
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 24
          },
          buttonConfirm: {
            backgroundColor: '#27ae60',
            borderRadius: 12,
            paddingVertical: 14,
            marginBottom: 8
          },
          buttonCancel: {
            backgroundColor: '#95a5a6',
            borderRadius: 12,
            paddingVertical: 14
          },
          textConfirm: {
            fontSize: 16,
            fontWeight: '600',
            color: '#fff'
          },
          textCancel: {
            fontSize: 16,
            fontWeight: '600',
            color: '#fff'
          }
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
    padding: 16,
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
    color: "#7f8c8d",
    fontWeight: '500',
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2c3e50",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    marginBottom: 12,
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  premiumBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f39c12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  trialText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  premiumBadgeTextHeader: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  toolsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  toolCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: "#ecf0f1",
    alignItems: "center",
    justifyContent: "center",
    position: 'relative',
    minHeight: 140,
  },
  premiumCard: {
    borderColor: "#f39c12",
    borderWidth: 1.5,
  },
  toolIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#e8f6f3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  lockedIconContainer: {
    backgroundColor: "#f8f9fa",
  },
  toolName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2c3e50",
    textAlign: "center",
    lineHeight: 20,
  },
  lockedToolName: {
    color: "#bdc3c7",
  },
  premiumBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#f39c12",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  premiumBadgeLocked: {
    backgroundColor: "#bdc3c7",
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeBanner: {
    backgroundColor: "#27ae60",
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#229954",
  },
  upgradeContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  upgradeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeTextContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  upgradeTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  upgradeSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 20,
  },
  expiredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: '#f8f9fa',
  },
  expiredIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fdedec',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  expiredTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#e74c3c",
    marginBottom: 16,
    textAlign: "center",
  },
  expiredText: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  subscribeButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 200,
  },
  subscribeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: 'center',
  },
});

export default SmartToolsScreen;