import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import SmartToolsScreen from "../screens/SmartToolsScreen";
import MarketPricesScreen from "../screens/MarketPricesScreen";
import LearnToGrowScreen from "../screens/LearnToGrowScreen";
import SmartCropCalendarScreen from "../screens/SmartCropCalendarScreen";
import ProfitCalculatorScreen from "../screens/ProfitCalculatorScreen";
import AgritechNewsScreen from "../screens/KnowledgeScreen";
import SatelliteImagingScreen from "../screens/SatelliteImagingScreen";
import ForumScreen from "../screens/ForumScreen";
import LivestockManagementScreen from "../screens/LivestockManagementScreen";
import PoultryManagementScreen from "../screens/PoultryManagementScreen";
import DiseaseManagementScreen from "../screens/DiseaseManagementScreen";
import SubscriptionStatusScreen from "../screens/SubscriptionStatusScreen";

const Stack = createStackNavigator();

const SmartToolsNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen 
        name="SmartToolsMain" 
        component={SmartToolsScreen} 
        options={{ title: "Smart Tools" }} 
      />
      <Stack.Screen name="MarketPrices" component={MarketPricesScreen} options={{ title: "Market Prices" }} />
      <Stack.Screen name="LearnToGrow" component={LearnToGrowScreen} options={{ title: "Learn to Grow" }} />
      <Stack.Screen name="SmartCropCalendar" component={SmartCropCalendarScreen} options={{ title: "Smart Crop Calendar" }} />
      <Stack.Screen name="ProfitCalculator" component={ProfitCalculatorScreen} options={{ title: "Profit Calculator" }} />
      <Stack.Screen name="LivestockManagement" component={LivestockManagementScreen} options={{ title: "Livestock Management" }} />
      <Stack.Screen name="PoultryManagement" component={PoultryManagementScreen} options={{ title: "Poultry Management" }} />
      <Stack.Screen name="SatelliteImaging" component={SatelliteImagingScreen} options={{ title: "Satellite Imaging & AI Insights" }} />
      <Stack.Screen name="DiseaseManagement" component={DiseaseManagementScreen} options={{ title: "Disease Management" }} />
      <Stack.Screen name="Forum" component={ForumScreen} options={{ title: "Forum" }} />
      <Stack.Screen name="Knowledge" component={AgritechNewsScreen} options={{ title: "Knowledge Base" }} />
      <Stack.Screen name="SubscriptionStatus" component={SubscriptionStatusScreen} />
    </Stack.Navigator>
  );
};

export default SmartToolsNavigator;