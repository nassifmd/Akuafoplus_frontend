import React, { useState, useCallback } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Config from "../Config/config";
import { useFocusEffect } from "@react-navigation/native";

const API_BASE_URL = Config.API_BASE_URL;

export default function SubscriptionStatusScreen() {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const res = await axios.get(`${API_BASE_URL}/subscription/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSub(res.data);
    } catch (err) {
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSubscription();
    }, [fetchSubscription])
  );

  if (loading) return <ActivityIndicator />;
  if (!sub) return <Text>No subscription found.</Text>;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontWeight: "bold", fontSize: 20 }}>Your Subscription</Text>
      <Text>Plan: {sub.plan}</Text>
      <Text>Status: {sub.status}</Text>
      <Text>Start: {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : "N/A"}</Text>
      <Text>End: {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "N/A"}</Text>
    </View>
  );
}