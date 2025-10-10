import React, { useEffect, useState } from "react";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import Dashboard from "./src/screens/Dashboard";
import SubscriptionScreen from "./src/screens/SubscriptionScreen";
import { View, ActivityIndicator, Linking } from "react-native";
import { PaperProvider } from "react-native-paper";
import RegisterEmployeeScreen from "./src/screens/RegisterEmployeeScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import FAQScreen from "./src/screens/FAQScreen";
import ContactSupportScreen from "./src/screens/ContactSupportScreen";
import LegalScreen from "./src/screens/LegalScreen";
import PrivacyPolicyScreen from "./src/screens/PrivacyPolicyScreen";
import TermsOfServiceScreen from "./src/screens/TermsOfServiceScreen";
import DataUsageAgreementScreen from "./src/screens/DataUsageAgreementScreen";
import KnowledgeContentScreen from "./src/screens/KnowledgeContentScreen";
import ForumScreen from "./src/screens/ForumScreen";
import CreatePostScreen from "./src/screens/CreatePostScreen";
import PostDetailScreen from "./src/screens/PostDetailScreen";
import SubscriptionHistoryScreen from "./src/screens/SubscriptionHistoryScreen";
import { AlertNotificationRoot } from "react-native-alert-notification";
import CartScreen from "./src/screens/CartScreen";
import WishlistScreen from "./src/screens/WishlistScreen";
import ProductDetailScreen from "./src/screens/ProductDetailScreen";
import CheckoutScreen from "./src/screens/CheckoutScreen";
import OrderConfirmationScreen from "./src/screens/OrderConfirmationScreen";
import OrderScreen from "./src/screens/OrderScreen";
import OrderDetailScreen from "./src/screens/OrderDetailScreen";
import PaymentStatusScreen from "./src/screens/PaymentStatusScreen";
import ExpertScreen from "./src/screens/ExpertScreen";
import ExpertDetailsScreen from "./src/screens/ExpertDetailsScreen";
import FarmlandScreen from "./src/screens/FarmlandScreen";
import FarmlandListingScreen from "./src/screens/FarmlandListingScreen";
import FarmlandDetailsScreen from "./src/screens/FarmlandDetailsScreen";
import InquiryFormScreen from "./src/screens/InquiryFormScreen";
import MyInquiriesScreen from "./src/screens/MyInquiriesScreen";
import BookingScreen from "./src/screens/BookingScreen";
import ExpertDashboardScreen from "./src/screens/ExpertDashboardScreen";
import BookingDetailsScreen from "./src/screens/BookingDetailsScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Define the Expert type if not imported from elsewhere
interface Expert {
  _id: string;
  name: string;
  specialty: string;
  experience: string;
  education: string;
  bio: string;
  email: string;
  phone: string;
  avatar: string;
  rating: number;
  totalConsultations: number;
  consultationFee: number;
  availability: string[];
}

export type RootStackParamList = {
  OnboardingScreen: undefined;
  LoginScreen: { redirectTo?: string };
  RegisterScreen: undefined;
  ForgotPasswordScreen: undefined;
  Dashboard: undefined;
  SubscriptionScreen: undefined;
  SubscriptionHistoryScreen: undefined;
  RegisterEmployeeScreen: undefined;
  EditProfileScreen: undefined;
  ChangePasswordScreen: undefined;
  FAQScreen: undefined;
  ContactSupportScreen: undefined;
  LegalScreen: undefined;
  PrivacyPolicyScreen: undefined;
  TermsOfServiceScreen: undefined;
  DataUsageAgreementScreen: undefined;
  KnowledgeContentScreen: { item: { _id: string; title: string; content: string; image?: string; tags?: string[] } };
  ForumScreen: undefined;
  CreatePost: undefined;
  PostDetail: { postId: string };
  Cart: undefined;
  Wishlist: undefined;
  ProductDetail: { productId: string };
  CheckoutScreen: undefined;
  OrderConfirmation: { orderId: string };
  OrderScreen: undefined;
  OrderDetail: { orderId: string };
  PaymentStatus: { orderId: string; clientReference?: string };
  ExpertScreen: undefined;
  ExpertDetails: { expert: Expert };
  FarmlandScreen: undefined;
  FarmlandListing: undefined;
  FarmlandDetails: { farmlandId: string };
  InquiryForm: { farmlandId: string };
  MyInquiries: undefined;
  BookingScreen: undefined;
  ExpertDashboardScreen: undefined;
  BookingDetails: { bookingId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const value = await AsyncStorage.getItem("hasSeenOnboarding");
      setHasSeenOnboarding(value === "false");

      const token = await AsyncStorage.getItem("accessToken");
      setUserToken(token);

      setIsLoading(false);
    };

    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url.startsWith("myapp://subscription-status")) {
        navigationRef.current?.navigate("SubscriptionScreen");
      }
    };
    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => {
      subscription.remove();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  let initialRouteName: keyof RootStackParamList = "OnboardingScreen";

  if (hasSeenOnboarding && !userToken) {
    initialRouteName = "LoginScreen";
  } else if (hasSeenOnboarding && userToken) {
    initialRouteName = "Dashboard";
  }

  return (
    <SafeAreaProvider>
      <AlertNotificationRoot>
        <PaperProvider>
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
              <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
              <Stack.Screen name="LoginScreen" component={LoginScreen} />
              <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
              <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
              <Stack.Screen name="Dashboard" component={Dashboard} />
              <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} />
              <Stack.Screen name="SubscriptionHistoryScreen" component={SubscriptionHistoryScreen} />
              <Stack.Screen name="RegisterEmployeeScreen" component={RegisterEmployeeScreen} />
              <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
              <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
              <Stack.Screen name="FAQScreen" component={FAQScreen} />
              <Stack.Screen name="ContactSupportScreen" component={ContactSupportScreen} />
              <Stack.Screen name="LegalScreen" component={LegalScreen} />
              <Stack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
              <Stack.Screen name="TermsOfServiceScreen" component={TermsOfServiceScreen} />
              <Stack.Screen name="DataUsageAgreementScreen" component={DataUsageAgreementScreen} />
              <Stack.Screen name="KnowledgeContentScreen" component={KnowledgeContentScreen} />
              <Stack.Screen name="ForumScreen" component={ForumScreen} />
              <Stack.Screen name="CreatePost" component={CreatePostScreen} />
              <Stack.Screen name="PostDetail" component={PostDetailScreen} />
              <Stack.Screen name="Cart" component={CartScreen} />
              <Stack.Screen name="Wishlist" component={WishlistScreen} />
              <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
              <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
              <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
              <Stack.Screen name="OrderScreen" component={OrderScreen} />
              <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
              <Stack.Screen name="PaymentStatus" component={PaymentStatusScreen} />
              <Stack.Screen name="ExpertScreen" component={ExpertScreen} />
              <Stack.Screen name="ExpertDetails" component={ExpertDetailsScreen} />
              <Stack.Screen name="FarmlandScreen" component={FarmlandScreen} />
              <Stack.Screen name="FarmlandListing" component={FarmlandListingScreen} />
              <Stack.Screen name="FarmlandDetails" component={FarmlandDetailsScreen} />
              <Stack.Screen name="InquiryForm" component={InquiryFormScreen} />
              <Stack.Screen name="MyInquiries" component={MyInquiriesScreen} />
              <Stack.Screen name="BookingScreen" component={BookingScreen} />
              <Stack.Screen name="ExpertDashboardScreen" component={ExpertDashboardScreen} />
              <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </AlertNotificationRoot>
    </SafeAreaProvider>
  );
};

export default App;