import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LivestockTab from './LivestockManagement/LivestockTab';
import InventoryTab from './LivestockManagement/InventoryTab';
import FeedFormulationTab from './LivestockManagement/FeedFormulationTab';
import FinanceTab from './LivestockManagement/FinanceTab';
import InsightTab from './LivestockManagement/InsightTab';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../Config/config';

const LivestockManagementScreen = ({ navigation }: { navigation: any }) => {
  const [activeTab, setActiveTab] = useState('Livestocks');
  const [subscription, setSubscription] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) return;
        const res = await axios.get(`${Config.API_BASE_URL}/subscription/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubscription(res.data);
      } catch (err) {
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };
    fetchSubscription();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) return;
        const res = await axios.get(`${Config.API_BASE_URL}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
      } catch (err) {
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return <View style={styles.center}><Text>Loading...</Text></View>;
  }

  const restrictedPlans = ["basic", "premium"];

  if (
    restrictedPlans.includes(subscription?.plan) &&
    subscription?.status === "pending"
  ) {
    return (
      <View style={styles.center}>
        <Text style={styles.restrictedText}>
          Your subscription is pending approval. Access to Livestock Management, Poultry Management, and Satellite Imaging & AI Insights is restricted.
        </Text>
      </View>
    );
  }

  // Restrict access for FREE USER and PENDING accounts
  if (
    subscription?.plan === "free_user" ||
    user?.status === "pending" ||
    subscription?.status === "pending"
  ) {
    return (
      <View style={styles.center}>
        <Text style={styles.restrictedText}>
          {user?.status === "pending"
            ? "Your account is pending approval. Access to Livestock Management, Poultry Management, and Satellite Imaging & AI Insights is restricted."
            : "This feature is available to paid subscribers only. Please upgrade your subscription."}
        </Text>
      </View>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'Livestocks': return <LivestockTab />;
      case 'Inventory': return <InventoryTab />;
      case 'Feed': return <FeedFormulationTab />;
      case 'Finance': return <FinanceTab navigation={navigation} />;
      case 'Insight': return <InsightTab />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {['Livestocks', 'Inventory', 'Feed', 'Finance', 'Insight'].map((tab) => (
          <TabButton 
            key={tab}
            label={tab}
            active={activeTab === tab}
            onPress={() => setActiveTab(tab)}
          />
        ))}
      </View>
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
};

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

const TabButton: React.FC<TabButtonProps> = ({ label, active, onPress }) => (
  <View style={[styles.tab, active && styles.activeTab]}>
    <Text 
      style={[styles.tabText, active && styles.activeText]}
      onPress={onPress}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#3f51b5',
  },
  tabText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  activeText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  restrictedText: { 
    color: 'red', 
    fontSize: 16, 
    textAlign: 'center', 
    padding: 20 
  },
});

export default LivestockManagementScreen;