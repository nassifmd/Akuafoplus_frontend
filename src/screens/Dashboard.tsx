import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "./HomeScreen";
import SmartToolsNavigator from "../navigation/SmartToolsNavigator";
import TradeScreen from "./TradeScreen";
import SettingsScreen from "./SettingsScreen";
import Icon from "react-native-vector-icons/MaterialIcons";

const Tab = createBottomTabNavigator();

const Dashboard = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName = "";

          if (route.name === "Home") {
            iconName = "home";
          } else if (route.name === "Smart Tools") {
            iconName = "build";
          // } else if (route.name === "Trade") {
          //   iconName = "storefront";
          } else if (route.name === "Settings") {
            iconName = "settings";
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Smart Tools" component={SmartToolsNavigator} />
      {/* <Tab.Screen name="Trade" component={TradeScreen} /> */}
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default Dashboard;
