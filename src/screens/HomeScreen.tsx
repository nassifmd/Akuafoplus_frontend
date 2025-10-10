import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Image,
  Animated,
  Easing,
  RefreshControl,
  Linking
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError } from "axios";
import Config from "../Config/config";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import LinearGradient from 'react-native-linear-gradient';

type RootStackParamList = {
  HomeScreen: undefined;
  SubscriptionScreen: undefined;
  RegisterEmployeeScreen: undefined;
  ExpertScreen: undefined;
  FarmlandScreen: undefined;
};

interface WeatherData {
  temperature?: number;
  precipitation?: number;
  humidity?: number;
  cloudCover?: number;
  solarRadiation?: number;
  forecastDate?: string;
}

interface ForecastResponse {
  success: boolean;
  message: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  forecastPeriod: string;
  data: {
    index: string[];
    columns: string[];
    data: any[][];
  };
  meta_data: any;
  parameters: any;
}

interface UserResponse {
  name: string;
}

interface Advertisement {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  isActive: boolean;
}

interface SubscriptionResponse {
  plan: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

const DEFAULT_WEATHER: WeatherData = {
  temperature: 28.5,
  precipitation: 0.2,
  humidity: 78,
  cloudCover: 40,
  solarRadiation: 450,
  forecastDate: new Date().toISOString().split("T")[0],
};

const { width } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [expandedWeather, setExpandedWeather] = useState<boolean>(false);
  const [weatherLoaded, setWeatherLoaded] = useState<boolean>(false);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [adsLoading, setAdsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free_user");
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  useEffect(() => {
    loadData();
    
    // Animation on component mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const loadData = async () => {
    await fetchUserInfo();
    await fetchSubscription();
    setAdsLoading(true);
    await fetchAdvertisements();
    setAdsLoading(false);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadData().then(() => setRefreshing(false));
  }, []);

  // Auto-scroll advertisements
  useEffect(() => {
    if (advertisements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prevIndex) => 
          (prevIndex + 1) % advertisements.length
        );
      }, 5000); // Change every 5 seconds

      return () => clearInterval(interval);
    }
  }, [advertisements.length]);

  const getToken = async (): Promise<string> => {
    const token = await AsyncStorage.getItem("accessToken");
    if (!token) throw new Error("Authentication token missing.");
    return token;
  };

  const fetchUserInfo = async () => {
    try {
      const token = await getToken();
      const response = await axios.get<UserResponse>(
        `${Config.API_BASE_URL}/user/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUserName(response.data.name || "User");
    } catch (err) {
      console.error("User fetch error:", err);
      setUserName("User");
    }
  };

  const fetchSubscription = async () => {
    try {
      const token = await getToken();
      const response = await axios.get<SubscriptionResponse>(
        `${Config.API_BASE_URL}/subscription/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSubscriptionPlan(response.data.plan || "free_user");
    } catch (err) {
      console.error("Subscription fetch error:", err);
      setSubscriptionPlan("free_user");
    }
  };

  const fetchAdvertisements = async () => {
    try {
      const token = await getToken();
      
      const response = await axios.get<{success: boolean, advertisements: Advertisement[]}>(
        `${Config.API_BASE_URL}/advertisements/active`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );
      
      if (response.data.success && response.data.advertisements) {
        setAdvertisements(response.data.advertisements);
      } else {
        setFallbackAdvertisements();
      }
    } catch (err) {
      console.error("Advertisements fetch error:", err);
      setFallbackAdvertisements();
    }
  };

  const setFallbackAdvertisements = () => {
    const fallbackAds = [
      {
        id: '1',
        title: 'Boost Your Crop Yield',
        description: 'Get expert advice on maximizing your harvest with proven techniques',
        imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&h=150&fit=crop&crop=center',
        isActive: true
      },
      {
        id: '2',
        title: 'Modern Farming Tools',
        description: 'Discover the latest in agricultural technology and smart farming solutions',
        imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=300&h=150&fit=crop&crop=center',
        isActive: true
      },
      {
        id: '3',
        title: 'Smart Irrigation Systems',
        description: 'Save water and increase efficiency with automated irrigation technology',
        imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&h=150&fit=crop&crop=center',
        isActive: true
      }
    ];
    setAdvertisements(fallbackAds);
  };

  const fetchWeatherData = async () => {
    if (weatherLoaded) return;
    
    setLoading(true);
    try {
      const forecast = await getWeatherForecast("Ghana");

      if (forecast && forecast.success && forecast.data.data.length > 0) {
        const columns = forecast.data.columns;
        const t2mCol = columns.indexOf("2m_temperature");
        const mtprCol = columns.indexOf("mean_total_precipitation_rate");
        const rh2mCol = columns.indexOf("2m_relative_humidity");
        const tccCol = columns.indexOf("total_cloud_cover");
        const ghiCol = columns.indexOf("all_sky_global_horizontal_irradiance");

        const formatted = forecast.data.data.slice(0, 1).map((row, index) => ({
          temperature: row[t2mCol],
          precipitation: row[mtprCol],
          humidity: row[rh2mCol],
          cloudCover: row[tccCol] ? row[tccCol] * 100 : 0,
          solarRadiation: row[ghiCol],
          forecastDate: new Date(forecast.data.index[index]).toLocaleDateString(),
        }));

        setWeatherData(formatted);
        setWeatherLoaded(true);
        setError(null);
      } else {
        throw new Error("No weather data available.");
      }
    } catch (err) {
      console.error("Weather fetching error:", (err as Error).message);
      setError("Unable to load weather data. Displaying default.");
      setWeatherData([DEFAULT_WEATHER]);
      setWeatherLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherForecast = async (
    location: string
  ): Promise<ForecastResponse> => {
    try {
      const token = await getToken();
      const response = await axios.get<ForecastResponse>(
        `${Config.API_BASE_URL}/predictive/weather-forecast`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { location },
        }
      );
      return response.data;
    } catch (err) {
      const error = err as AxiosError | Error;
      if (axios.isAxiosError(error)) {
        console.error("Weather API error response:", error.response?.data);
      } else {
        console.error("Weather API error message:", error.message);
      }
      throw new Error("Weather service unavailable.");
    }
  };

  const WeatherIcon = ({ condition, size = 20 }: { condition: string, size?: number }) => {
    switch (condition) {
      case "temperature":
        return <MaterialIcons name="device-thermostat" size={size} color="#FF7043" />;
      case "humidity":
        return <MaterialIcons name="opacity" size={size} color="#42A5F5" />;
      case "precipitation":
        return <MaterialIcons name="umbrella" size={size} color="#5C6BC0" />;
      case "cloudCover":
        return <MaterialIcons name="cloud" size={size} color="#78909C" />;
      case "solarRadiation":
        return <MaterialIcons name="wb-sunny" size={size} color="#FFCA28" />;
      default:
        return <MaterialIcons name="help-outline" size={size} color="#9E9E9E" />;
    }
  };

  const toggleWeatherExpand = async () => {
    if (!weatherLoaded) {
      await fetchWeatherData();
    }
    setExpandedWeather(!expandedWeather);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Track ad click in backend and open link (if any)
  const handleAdPress = async (ad: Advertisement) => {
    try {
      await axios.post(
        `${Config.API_BASE_URL}/advertisements/${ad.id}/click`,
        {}
      );
    } catch (e: any) {
      console.log("Ad click track failed:", e?.response?.data || e?.message);
    }

    if (ad.link) {
      try {
        const supported = await Linking.canOpenURL(ad.link);
        if (supported) {
          await Linking.openURL(ad.link);
        } else {
          console.log("Cannot open ad link:", ad.link);
        }
      } catch (err) {
        console.log("Open ad link failed:", err);
      }
    }
  };

  const renderAdvertisementCarousel = () => {
    if (advertisements.length === 0) {
      return (
        <Animated.View style={[styles.advertisementContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ads</Text>
            <MaterialIcons name="campaign" size={24} color="#4A6FA5" />
          </View>
          <View style={styles.adCard}>
            <View style={styles.adContent}>
              <ActivityIndicator size="small" color="#4A6FA5" />
              <Text style={styles.adTitle}>Loading featured content...</Text>
            </View>
          </View>
        </Animated.View>
      );
    }

    const currentAd = advertisements[currentAdIndex];

    return (
      <Animated.View style={[styles.advertisementContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ads</Text>
          <MaterialIcons name="campaign" size={24} color="#4A6FA5" />
        </View>
        
        <TouchableOpacity
          style={styles.adCard}
          activeOpacity={0.9}
          onPress={() => handleAdPress(currentAd)}
        >
          {currentAd.imageUrl ? (
            <Image 
              source={{ uri: currentAd.imageUrl }} 
              style={styles.adImage}
              resizeMode="cover"
              onError={(error) => {
                console.log('Image load error:', error.nativeEvent.error);
              }}
            />
          ) : (
            // Fallback background if no imageUrl provided
            <View style={[styles.adImage, { backgroundColor: '#E2E8F0' }]} />
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.adGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.adContent}>
            <Text style={styles.adTitle}>{currentAd.title}</Text>
            <Text style={styles.adDescription}>{currentAd.description}</Text>
            <TouchableOpacity
              style={styles.adCta}
              onPress={() => handleAdPress(currentAd)}
              activeOpacity={0.8}
            >
              <Text style={styles.adCtaText}>Learn more</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {advertisements.length > 1 && (
            <View style={styles.adIndicators}>
              {advertisements.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentAdIndex(index)}
                  style={styles.adIndicatorContainer}
                >
                  <View
                    style={[
                      styles.adIndicator,
                      index === currentAdIndex && styles.adIndicatorActive
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4A6FA5"]}
            tintColor="#4A6FA5"
          />
        }
      >
        {/* Header Section */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          
          <TouchableOpacity
            onPress={() => navigation.navigate("SubscriptionScreen")}
            activeOpacity={0.8}
            style={styles.upgradeButtonContainer}
          >
            <LinearGradient
              colors={
                subscriptionPlan === "premium"
                  ? ['#FFD700', '#FFA500']
                  : ['#667eea', '#764ba2']
              }
              style={styles.upgradeButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons 
                name={subscriptionPlan === "premium" ? "verified" : "rocket-launch"} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.upgradeButtonText}>
                {subscriptionPlan === "premium" ? "Premium" : "Upgrade Plan"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View style={[styles.quickActionsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <MaterialIcons name="flash-on" size={24} color="#4A6FA5" />
          </View>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              onPress={() => navigation.navigate("ExpertScreen")}
              activeOpacity={0.9}
              style={styles.quickActionTouchable}
            >
              <LinearGradient
                colors={['#43e97b', '#38f9d7']}
                style={styles.quickActionButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.quickActionIcon}>
                  <MaterialIcons name="support-agent" size={32} color="#fff" />
                </View>
                <Text style={styles.quickActionText}>Expert Advice</Text>
                <Text style={styles.quickActionSubtext}>Connect with experts</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            {/* <TouchableOpacity
              onPress={() => navigation.navigate("FarmlandScreen")}
              activeOpacity={0.9}
              style={styles.quickActionTouchable}
            >
              <LinearGradient
                colors={['#fa709a', '#fee140']}
                style={styles.quickActionButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.quickActionIcon}>
                  <MaterialIcons name="landscape" size={32} color="#fff" />
                </View>
                <Text style={styles.quickActionText}>Farm Land</Text>
                <Text style={styles.quickActionSubtext}>Manage your fields</Text>
              </LinearGradient>
            </TouchableOpacity> */}
          </View>
        </Animated.View>

        {/* Advertisement Carousel */}
        {renderAdvertisementCarousel()}

        {/* Weather Section */}
        <Animated.View style={[styles.weatherContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weather Forecast</Text>
            <MaterialIcons name="cloud-queue" size={24} color="#4A6FA5" />
          </View>

          <TouchableOpacity 
            onPress={toggleWeatherExpand}
            activeOpacity={0.8}
            style={styles.weatherButtonTouchable}
          >
            <LinearGradient
              colors={['#fdfcfb', '#e2d1c3']}
              style={styles.weatherButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.weatherButtonContent}>
                <View style={styles.weatherButtonLeft}>
                  <WeatherIcon condition="temperature" size={24} />
                  <View>
                    <Text style={styles.weatherButtonTemp}>
                      {weatherLoaded && weatherData.length > 0 
                        ? `${weatherData[0].temperature?.toFixed(1)}°C`
                        : 'Tap to load weather'
                      }
                    </Text>
                    {weatherLoaded && weatherData.length > 0 && (
                      <Text style={styles.weatherButtonDate}>
                        {weatherData[0].forecastDate}
                      </Text>
                    )}
                  </View>
                </View>
                {loading ? (
                  <ActivityIndicator size="small" color="#4A6FA5" />
                ) : (
                  <MaterialIcons 
                    name={expandedWeather ? "expand-less" : "expand-more"} 
                    size={24} 
                    color="#4A6FA5" 
                  />
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {error && !loading && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={24} color="#E53935" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {expandedWeather && weatherLoaded && weatherData.length > 0 && (
            <Animated.View 
              style={styles.weatherCard}
            >
              <View style={styles.weatherDataRow}>
                <View style={styles.weatherDataItem}>
                  <WeatherIcon condition="humidity" />
                  <Text style={styles.weatherDataLabel}>Humidity</Text>
                  <Text style={styles.weatherDataValue}>{weatherData[0].humidity?.toFixed(1)}%</Text>
                </View>
                
                <View style={styles.weatherDataItem}>
                  <WeatherIcon condition="precipitation" />
                  <Text style={styles.weatherDataLabel}>Precipitation</Text>
                  <Text style={styles.weatherDataValue}>{weatherData[0].precipitation?.toFixed(1)} mm</Text>
                </View>
              </View>
              
              <View style={styles.weatherDataRow}>
                <View style={styles.weatherDataItem}>
                  <WeatherIcon condition="cloudCover" />
                  <Text style={styles.weatherDataLabel}>Cloud Cover</Text>
                  <Text style={styles.weatherDataValue}>{weatherData[0].cloudCover?.toFixed(1)}%</Text>
                </View>
                
                <View style={styles.weatherDataItem}>
                  <WeatherIcon condition="solarRadiation" />
                  <Text style={styles.weatherDataLabel}>Solar Radiation</Text>
                  <Text style={styles.weatherDataValue}>{weatherData[0].solarRadiation?.toFixed(1)} W/m²</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.weatherDetailsButton}
                onPress={() => console.log("View detailed forecast")}
              >
                <Text style={styles.weatherDetailsText}>View detailed forecast</Text>
                <MaterialIcons name="chevron-right" size={20} color="#4A6FA5" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 4,
    fontWeight: '500',
  },
  userName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1E293B",
  },
  upgradeButtonContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  upgradeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  upgradeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  quickActionsContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  quickActionTouchable: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionButton: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    height: 140,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 4,
  },
  quickActionSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    textAlign: "center",
  },
  advertisementContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  adCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    height: 200,
  },
  adImage: {
    width: "100%",
    height: "100%",
    position: 'absolute',
  },
  adGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  adContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  adTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  adDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 12,
  },
  adCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  adCtaText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginRight: 4,
  },
  adIndicators: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: "row",
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 6,
  },
  adIndicatorContainer: {
    padding: 4,
  },
  adIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  adIndicatorActive: {
    backgroundColor: "#fff",
  },
  weatherContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    marginTop: 12,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    marginLeft: 10,
  },
  weatherButtonTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  weatherButton: {
    padding: 20,
  },
  weatherButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weatherButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  weatherButtonTemp: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 12,
  },
  weatherButtonDate: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 12,
  },
  weatherCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherDataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  weatherDataItem: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  weatherDataLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 6,
    fontWeight: '500',
  },
  weatherDataValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  weatherDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
  },
  weatherDetailsText: {
    color: "#4A6FA5",
    fontWeight: "600",
    fontSize: 14,
    marginRight: 4,
  },
  resourcesContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  resourcesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resourceItem: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 12,
  },
  resourceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  resourceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
});

export default HomeScreen;