import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar
} from "react-native";
import AlertPro from 'react-native-alert-pro';
import axios from "axios";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Config from "../Config/config";

// Types (keep the same as before)
type CropVariety = {
  varietyName: string;
  description: string;
  climate: string;
  soilType: string;
  yield: string;
  pestsDiseases: string;
};

type AnimalBreed = {
  breedName: string;
  description: string;
  productivity: string;
  climateSuitability: string;
};

type PoultryBreed = {
  breedName: string;
  description: string;
  productivity: string;
  climateSuitability: string;
};

type BaseGuide = {
  _id: string;
  name: string;
  category: string;
  description: string;
  mainImage: string;
  sampleImages: string[];
  marketToSell: string;
};

type CropGuide = BaseGuide & {
  cropLifeCycle: string;
  plantingSeason: string;
  climate: string;
  soilType: string;
  spacing: string;
  watering: string;
  fertilizer: string;
  pestsDiseases: string;
  landPreparationTime: string;
  plantingTime: string;
  fertilizerApplicationTime: string;
  pesticideHerbicideApplicationTime: string;
  irrigationTime: string;
  harvestingTime: string;
  transportationTime: string;
  transplantingTime: string;
  transplantingDepth: string;
  transplantingSpacing: string;
  varieties: CropVariety[];
};

type AnimalGuide = BaseGuide & {
  breedLifeCycle: string;
  habitat: string;
  feeding: string;
  breeding: string;
  diseaseManagement: string;
  vaccinationSchedule: string;
  breeds: AnimalBreed[];
};

type PoultryGuide = BaseGuide & {
  breedLifeCycle: string;
  housing: string;
  feeding: string;
  breeding: string;
  diseaseManagement: string;
  vaccinationSchedule: string;
  eggProduction: string;
  breeds: PoultryBreed[];
};

const LearnToGrowScreen = () => {
  // State declarations (keep the same as before)
  const [cropGuides, setCropGuides] = useState<CropGuide[]>([]);
  const [animalGuides, setAnimalGuides] = useState<AnimalGuide[]>([]);
  const [poultryGuides, setPoultryGuides] = useState<PoultryGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"crops" | "animals" | "poultry">("crops");
  const [selectedItem, setSelectedItem] = useState<CropGuide | AnimalGuide | PoultryGuide | null>(null);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string }>({
    title: '',
    message: ''
  });
  const alertRef = useRef<any>(null);

  const API_BASE_URL = `${Config.API_BASE_URL}/learn`;

  // Modified fetchGuides function with react-native-alert-notification
  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          setAlertConfig({
            title: 'Session Expired',
            message: 'Please log in again.'
          });
            // open alert
          setTimeout(() => alertRef.current?.open(), 0);
          return;
        }

        const [cropRes, animalRes, poultryRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/crops`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/animals`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/poultry`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setCropGuides(cropRes.data.crops);
        setAnimalGuides(animalRes.data.animals);
        setPoultryGuides(poultryRes.data.poultry);

      } catch (error: any) {
        console.error("Error fetching guides:", error);
        setAlertConfig({
          title: 'Error',
          message: 'Failed to load guides. Please check your connection and try again.'
        });
        setTimeout(() => alertRef.current?.open(), 0);
      } finally {
        setLoading(false);
      }
    };

    fetchGuides();
  }, []);

  // renderCard function (keep the same as before)
  const renderCard = ({ item }: { item: CropGuide | AnimalGuide | PoultryGuide }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedItem(item)}>
      <View style={styles.cardImageContainer}>
        <Image source={{ uri: item.mainImage }} style={styles.cardImage} />
        <View style={styles.imageOverlay} />
        <Text style={styles.cardCategory}>{item.category}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.cardButton}>
          <Text style={styles.cardButtonText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
        </View>
      </View>
    </TouchableOpacity>
  );

  // renderVarieties function (keep the same as before)
  const renderVarieties = (varieties: CropVariety[] | AnimalBreed[] | PoultryBreed[]) => (
    varieties && varieties.length > 0 ? (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>
          {selectedTab === "crops" ? "🌱 Varieties" : "🐄 Breeds"}
        </Text>
        <View style={styles.varietiesGrid}>
          {varieties.map((variety, index) => (
            <View key={index} style={styles.varietyCard}>
              <Text style={styles.varietyName}>
                {"breedName" in variety ? variety.breedName : "varietyName" in variety ? variety.varietyName : ""}
              </Text>
              {variety.description && <Text style={styles.varietyText}>{variety.description}</Text>}
              {"climateSuitability" in variety && variety.climateSuitability && (
                <View style={styles.varietyDetail}>
                  <Ionicons name="partly-sunny" size={14} color="#6B7280" />
                  <Text style={styles.varietyDetailText}>{variety.climateSuitability}</Text>
                </View>
              )}
              {"productivity" in variety && variety.productivity && (
                <View style={styles.varietyDetail}>
                  <Ionicons name="trending-up" size={14} color="#6B7280" />
                  <Text style={styles.varietyDetailText}>{variety.productivity}</Text>
                </View>
              )}
              {"yield" in variety && variety.yield && (
                <View style={styles.varietyDetail}>
                  <Ionicons name="stats-chart" size={14} color="#6B7280" />
                  <Text style={styles.varietyDetailText}>{variety.yield}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    ) : null
  );

  // NEW: Render categorized crop information
  const renderCropManagementSections = (item: CropGuide) => {
    return (
      <>
        {/* Nutrition Management Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🌱 Nutrition Management</Text>
          <View style={styles.managementGrid}>
            {item.fertilizer && (
              <View style={styles.managementItem}>
                <Ionicons name="nutrition" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Fertilizer</Text>
                <Text style={styles.managementValue}>{item.fertilizer}</Text>
              </View>
            )}
            {item.fertilizerApplicationTime && (
              <View style={styles.managementItem}>
                <Ionicons name="time" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Application Time</Text>
                <Text style={styles.managementValue}>{item.fertilizerApplicationTime}</Text>
              </View>
            )}
            {item.soilType && (
              <View style={styles.managementItem}>
                <Ionicons name="leaf" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Soil Type</Text>
                <Text style={styles.managementValue}>{item.soilType}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Weed Management Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🌿 Weed Management</Text>
          <View style={styles.managementGrid}>
            {item.pesticideHerbicideApplicationTime && (
              <View style={styles.managementItem}>
                <Ionicons name="alert" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Herbicide Application</Text>
                <Text style={styles.managementValue}>{item.pesticideHerbicideApplicationTime}</Text>
              </View>
            )}
            {item.spacing && (
              <View style={styles.managementItem}>
                <Ionicons name="resize" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Plant Spacing</Text>
                <Text style={styles.managementValue}>{item.spacing}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pest Control Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🐜 Pest Control</Text>
          <View style={styles.managementGrid}>
            {item.pestsDiseases && (
              <View style={styles.managementItem}>
                <Ionicons name="bug" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Common Pests/Diseases</Text>
                <Text style={styles.managementValue}>{item.pestsDiseases}</Text>
              </View>
            )}
            {item.pesticideHerbicideApplicationTime && (
              <View style={styles.managementItem}>
                <Ionicons name="medical" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Pesticide Application</Text>
                <Text style={styles.managementValue}>{item.pesticideHerbicideApplicationTime}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Harvesting Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>✂️ Harvesting</Text>
          <View style={styles.managementGrid}>
            {item.harvestingTime && (
              <View style={styles.managementItem}>
                <Ionicons name="calendar" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Harvest Time</Text>
                <Text style={styles.managementValue}>{item.harvestingTime}</Text>
              </View>
            )}
            {item.transportationTime && (
              <View style={styles.managementItem}>
                <Ionicons name="car" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Transportation</Text>
                <Text style={styles.managementValue}>{item.transportationTime}</Text>
              </View>
            )}
          </View>
        </View>
      </>
    );
  };

  // NEW: Render categorized livestock/poultry information
  const renderLivestockManagementSections = (item: AnimalGuide | PoultryGuide) => {
    return (
      <>
        {/* Disease and Health Management Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>💉 Disease & Health Management</Text>
          <View style={styles.managementGrid}>
            {item.diseaseManagement && (
              <View style={styles.managementItem}>
                <Ionicons name="medkit" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Disease Management</Text>
                <Text style={styles.managementValue}>{item.diseaseManagement}</Text>
              </View>
            )}
            {item.vaccinationSchedule && (
              <View style={styles.managementItem}>
                <Ionicons name="shield" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Vaccination Schedule</Text>
                <Text style={styles.managementValue}>{item.vaccinationSchedule}</Text>
              </View>
            )}
            {'housing' in item && item.housing && (
              <View style={styles.managementItem}>
                <Ionicons name="home" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Housing Requirements</Text>
                <Text style={styles.managementValue}>{item.housing}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Feed Production and Management Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🌾 Feed & Nutrition</Text>
          <View style={styles.managementGrid}>
            {item.feeding && (
              <View style={styles.managementItem}>
                <Ionicons name="nutrition" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Feeding Requirements</Text>
                <Text style={styles.managementValue}>{item.feeding}</Text>
              </View>
            )}
            {'habitat' in item && item.habitat && (
              <View style={styles.managementItem}>
                <Ionicons name="globe" size={20} color="#4CAF50" />
                <Text style={styles.managementLabel}>Habitat</Text>
                <Text style={styles.managementValue}>{item.habitat}</Text>
              </View>
            )}
          </View>
        </View>
      </>
    );
  };

  const renderDetails = (item: CropGuide | AnimalGuide | PoultryGuide) => {
    // Type guards
    const isAnimalGuide = (guide: any): guide is AnimalGuide => 'habitat' in guide;
    const isPoultryGuide = (guide: any): guide is PoultryGuide => 'housing' in guide;
    const isCropGuide = (guide: any): guide is CropGuide => 'plantingSeason' in guide;

    return (
      <SafeAreaView style={styles.detailContainer}>
        <ScrollView contentContainerStyle={styles.detailContent}>
          {/* Header with back button */}
          <View style={styles.detailHeader}>
            <TouchableOpacity 
              onPress={() => setSelectedItem(null)} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#4CAF50" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Main image with overlay */}
          <View style={styles.detailImageContainer}>
            <Image source={{ uri: item.mainImage }} style={styles.detailImage} />
            <View style={styles.detailImageOverlay} />
            <Text style={styles.detailTitle}>{item.name}</Text>
            <Text style={styles.detailCategory}>{item.category}</Text>
          </View>

          {/* Sample images carousel */}
          {item.sampleImages && item.sampleImages.length > 0 && (
            <View style={styles.sampleImagesContainer}>
              <Text style={styles.sectionTitle}>Gallery</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sampleScroll}>
                {item.sampleImages.map((img, i) => (
                  <Image key={i} source={{ uri: img }} style={styles.sampleImage} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>

          {/* Key Info Cards */}
          <View style={styles.keyInfoContainer}>
            <View style={styles.keyInfoCard}>
              <Ionicons name="time" size={20} color="#4CAF50" />
              <Text style={styles.keyInfoTitle}>Life Cycle</Text>
              <Text style={styles.keyInfoValue}>
                {isAnimalGuide(item) || isPoultryGuide(item) ? item.breedLifeCycle : 
                 isCropGuide(item) ? item.cropLifeCycle : "N/A"}
              </Text>
            </View>

            {isCropGuide(item) && item.plantingSeason && (
              <View style={styles.keyInfoCard}>
                <Ionicons name="calendar" size={20} color="#4CAF50" />
                <Text style={styles.keyInfoTitle}>Planting Season</Text>
                <Text style={styles.keyInfoValue}>{item.plantingSeason}</Text>
              </View>
            )}

            {isAnimalGuide(item) && item.habitat && (
              <View style={styles.keyInfoCard}>
                <Ionicons name="home" size={20} color="#4CAF50" />
                <Text style={styles.keyInfoTitle}>Habitat</Text>
                <Text style={styles.keyInfoValue}>{item.habitat}</Text>
              </View>
            )}

            {isPoultryGuide(item) && item.housing && (
              <View style={styles.keyInfoCard}>
                <Ionicons name="business" size={20} color="#4CAF50" />
                <Text style={styles.keyInfoTitle}>Housing</Text>
                <Text style={styles.keyInfoValue}>{item.housing}</Text>
              </View>
            )}
          </View>

          {/* Crop-specific management sections */}
          {isCropGuide(item) && renderCropManagementSections(item)}

          {/* Livestock/Poultry-specific management sections */}
          {(isAnimalGuide(item) || isPoultryGuide(item)) && renderLivestockManagementSections(item)}

          {/* Varieties/Breeds Section */}
          {isCropGuide(item) && renderVarieties(item.varieties)}
          {(isAnimalGuide(item) || isPoultryGuide(item)) && renderVarieties(item.breeds)}

          {/* Market Information */}
          {item.marketToSell && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>💰 Marketing</Text>
              <View style={styles.marketCard}>
                <Ionicons name="cash" size={24} color="#4CAF50" style={styles.marketIcon} />
                <Text style={styles.marketText}>{item.marketToSell}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  };

  // Loading and empty states (keep the same as before)
  if (loading) {
    return (
      <>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading Guides...</Text>
        </View>
        <AlertPro
          ref={alertRef}
          onConfirm={() => alertRef.current?.close()}
          showCancel={false}
          title={alertConfig.title}
            message={alertConfig.message}
          textConfirm="OK"
        />
      </>
    );
  }

  if (selectedItem) {
    return (
      <>
        {renderDetails(selectedItem)}
        <AlertPro
          ref={alertRef}
          onConfirm={() => alertRef.current?.close()}
          showCancel={false}
          title={alertConfig.title}
          message={alertConfig.message}
          textConfirm="OK"
        />
      </>
    );
  }
  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#F8F9FA" barStyle="dark-content" />
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Farming Guide</Text>
          <Text style={styles.headerSubtitle}>Expert knowledge for your farming needs</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === "crops" && styles.activeTab]}
            onPress={() => setSelectedTab("crops")}
          >
            <Ionicons name="leaf" size={20} color={selectedTab === "crops" ? "#FFF" : "#4CAF50"} />
            <Text style={[styles.tabText, selectedTab === "crops" && styles.activeTabText]}>Crops</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === "animals" && styles.activeTab]}
            onPress={() => setSelectedTab("animals")}
          >
            <Ionicons name="paw" size={20} color={selectedTab === "animals" ? "#FFF" : "#4CAF50"} />
            <Text style={[styles.tabText, selectedTab === "animals" && styles.activeTabText]}>Livestock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === "poultry" && styles.activeTab]}
            onPress={() => setSelectedTab("poultry")}
          >
            <Ionicons name="egg" size={20} color={selectedTab === "poultry" ? "#FFF" : "#4CAF50"} />
            <Text style={[styles.tabText, selectedTab === "poultry" && styles.activeTabText]}>Poultry</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <FlatList
          data={
            selectedTab === "crops"
              ? cropGuides
              : selectedTab === "animals"
              ? animalGuides
              : poultryGuides
          }
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="sad" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No guides available for this category</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
      <AlertPro
        ref={alertRef}
        onConfirm={() => alertRef.current?.close()}
        showCancel={false}
        title={alertConfig.title}
        message={alertConfig.message}
        textConfirm="OK"
      />
    </>
  );
};

const styles = StyleSheet.create({
  // Base containers (keep the same as before)
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  detailContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  detailContent: {
    paddingBottom: 30,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },

  // Header styles (keep the same as before)
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  // Tab styles (keep the same as before)
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  activeTab: {
    backgroundColor: "#4CAF50",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    marginLeft: 8,
  },
  activeTabText: {
    color: "#FFF",
  },

  // List styles (keep the same as before)
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 16,
    textAlign: "center",
  },

  // Card styles (keep the same as before)
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageContainer: {
    height: 160,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  cardCategory: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: "rgba(76, 175, 80, 0.9)",
    color: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  cardButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    marginRight: 4,
  },

  // Detail view styles (keep the same as before)
  detailHeader: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4CAF50",
    marginLeft: 8,
  },
  detailImageContainer: {
    height: 280,
    position: "relative",
  },
  detailImage: {
    width: "100%",
    height: "100%",
  },
  detailImageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  detailTitle: {
    position: "absolute",
    bottom: 48,
    left: 24,
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  detailCategory: {
    position: "absolute",
    bottom: 24,
    left: 24,
    fontSize: 16,
    fontWeight: "500",
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sampleImagesContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sampleScroll: {
    marginTop: 8,
  },
  sampleImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
  },
  descriptionContainer: {
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    margin: 16,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#4B5563",
  },

  // Section styles (keep the same as before)
  sectionContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
    color: "#4B5563",
  },

  // Key info cards (keep the same as before)
  keyInfoContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  keyInfoCard: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  keyInfoTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 4,
  },
  keyInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },

  // NEW: Management grid styles
  managementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  managementItem: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  managementLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 8,
  },
  managementValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 4,
  },

  // Varieties/Breeds styles (keep the same as before)
  varietiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  varietyCard: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  varietyName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  varietyText: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 8,
    lineHeight: 18,
  },
  varietyDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  varietyDetailText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 6,
  },

  // Market info
  marketCard: {
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  marketIcon: {
    marginRight: 12,
  },
  marketText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#1F2937",
  },
});

export default LearnToGrowScreen;