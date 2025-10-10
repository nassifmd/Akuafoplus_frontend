import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  ActivityIndicator, 
  ScrollView,
  Modal,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Dropdown } from 'react-native-element-dropdown';
import Icon from "react-native-vector-icons/MaterialIcons";
import axios, { AxiosError } from 'axios';
import Config from '../Config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertPro from 'react-native-alert-pro';

interface AgriculturePlan {
  _id: string;
  planName: string;
  agricultureType: 'crop' | 'livestock' | 'poultry';
  investmentDetails: any;
  durationMonths: number;
  calculation: {
    totalInvestment: number;
    expectedRevenue: number;
    profit: number;
    roi: number;
    breakEvenPoint?: string;
    metrics: {
      marketPriceUsed: number;
      productionType?: 'meat' | 'egg';
      priceUnit?: string;
      totalProduction?: string;
      survivingBirds?: number;
      eggsPerBirdPerMonth?: number;
      avgWeightPerBird?: number;
      landCostBreakdown?: {
        ownershipType: string;
        cost: number;
        explanation: string;
      };
      costBreakdown?: {
        ownershipType: string;
        totalLandCost: number;
        totalOperationalCost: number;
        totalMachineryCost: number;
        explanation: string;
        totalSeedCost?: number;
      };
      userConfig?: {
        laborCostPerAcrePerMonth: number;
        fertilizerCostPerAcrePerMonth: number;
        pesticideCostPerAcrePerMonth: number;
        irrigationCostPerAcrePerMonth: number;
        landPreparationMethod: string;
        harvestingMethod: string;
        landPrepCostPerAcre: number;
        harvestCostPerAcre: number;
        seedCostPerAcre?: number;
      };
      landOwnershipType?: string;
      landCost?: number;
      [key: string]: any;
    };
  };
  marketPriceUsed: number;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  roleAtCreation?: string;
}

interface MarketPrice {
  _id: string;
  commodity: string;
  category: string;
  price: number;
  unit: string;
  location: string;
  date: string;
}

interface FormData {
  planName: string;
  agricultureType: 'crop' | 'livestock' | 'poultry';
  durationMonths: string;
  notes: string;
  landSize: string;
  landUnit: 'acres' | 'hectares' | 'squareMeters';
  cropType: string;
  costPerUnit: string;
  expectedYieldPerUnit?: string;
  soilQuality?: string;
  irrigationQuality?: string;
  climateQuality?: string;
  animalType: string;
  numberOfAnimals: string;
  costPerAnimal: string;
  expectedWeightPerAnimal?: string;
  feedQuality?: string;
  breedQuality?: string;
  purchaseAgeMonths?: string;
  purchaseWeightKg?: string;
  birdType: string;
  numberOfBirds: string;
  costPerBird: string;
  eggsPerBirdPerMonth?: string;
  productionType?: 'meat' | 'egg';
  landOwnershipType: 'own' | 'buy' | 'rent';
  landPurchasePrice: string;
  landRentPerMonth: string;
  
  // Enhanced operational costs
  laborCostPerMonth: string;
  fertilizerCost: string;
  pesticideCost: string;
  irrigationCost: string;
  seedCost: string; // Add seed cost field
  
  // Machinery selection
  landPreparationMethod: 'manual' | 'tractor' | 'combined';
  harvestingMethod: 'manual' | 'mechanical';
  
  // Minimum wage reference
  useMinimumWage: boolean;
}

interface ProjectionYear {
  year: number;
  totalInvestment: number;
  expectedRevenue: number;
  profit: number;
  roi: number;
  cumulativeProfit: number;
  marketPriceUsed: number;
}

// Add ordinal helper
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

// Ghana Minimum Wage Reference (2024)
const MINIMUM_WAGE_DATA = {
  daily: 19.97,
  monthly: 520,
  hourly: 2.5
};

const CROP_DURATION_DATA: Record<string, number> = {
  wheat: 4,
  maize: 6,
  rice: 5,
  barley: 4,
  tomato: 3,
  potato: 4,
  onion: 5,
  cabbage: 3,
  banana: 12,
  mango: 12,
  orange: 12,
  coffee: 12,
  tea: 12,
  cotton: 6,
  sugarcane: 12
};

const LIVESTOCK_DURATION_DATA: Record<string, number> = {
  cattle: 12,
  sheep: 8,
  goat: 6
};

const POULTRY_DURATION_DATA: Record<string, number> = {
  layers: 12,
  broilers: 2,
  turkey: 6,
  duck: 12
};

const animalTypes = [
  { label: 'Cattle', value: 'cattle' },
  { label: 'Goat', value: 'goat' },
  { label: 'Sheep', value: 'sheep' },
];

const cropTypes = [
  { label: 'Maize', value: 'maize' },
  { label: 'Rice', value: 'rice' },
  { label: 'Wheat', value: 'wheat' },
  { label: 'Tomato', value: 'tomato' },
  { label: 'Potato', value: 'potato' },
  { label: 'Onion', value: 'onion' },
  { label: 'Coffee', value: 'coffee' },
  { label: 'Tea', value: 'tea' },
  { label: 'Sugarcane', value: 'sugarcane' },
  { label: 'Banana', value: 'banana' },
  { label: 'Mango', value: 'mango' },
  { label: 'Orange', value: 'orange' },
];

const birdTypes = [
  { label: 'Layers (Egg Production)', value: 'layers' },
  { label: 'Broilers (Meat Production)', value: 'broilers' },
  { label: 'Turkey (Meat Production)', value: 'turkey' },
  { label: 'Duck (Meat Production)', value: 'duck' }
];

const productionTypes = [
  { label: 'Egg Production', value: 'egg' },
  { label: 'Meat Production', value: 'meat' },
];

const landOwnershipOptions = [
  { label: 'I Own This Land', value: 'own' },
  { label: 'Plan to Buy Land', value: 'buy' },
  { label: 'Plan to Rent Land', value: 'rent' },
];

const landPreparationMethods = [
  { label: 'Manual Labor Only (GHC 300/acre)', value: 'manual' },
  { label: 'Tractor Services (GHC 250/acre)', value: 'tractor' },
];

const harvestingMethods = [
  { label: 'Manual Harvesting (GHC 300/acre)', value: 'manual' },
  { label: 'Mechanical Harvester (GHC 250/acre)', value: 'mechanical' },
];

const ProfitCalculatorScreen = () => {
  const [plans, setPlans] = useState<AgriculturePlan[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [priceModalVisible, setPriceModalVisible] = useState<boolean>(false);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    planName: '',
    agricultureType: 'crop',
    durationMonths: '',
    notes: '',
    landSize: '',
    landUnit: 'acres',
    cropType: '',
    costPerUnit: '',
    animalType: '',
    numberOfAnimals: '',
    costPerAnimal: '',
    birdType: '',
    numberOfBirds: '',
    costPerBird: '',
    productionType: 'egg',
    soilQuality: '',
    irrigationQuality: '',
    climateQuality: '',
    feedQuality: '',
    breedQuality: '',
    purchaseAgeMonths: '',
    purchaseWeightKg: '',
    landOwnershipType: 'own',
    landPurchasePrice: '',
    landRentPerMonth: '',
    
    // Enhanced operational costs
    laborCostPerMonth: '',
    fertilizerCost: '',
    pesticideCost: '',
    irrigationCost: '',
    seedCost: '', // Add seed cost to initial state
    
    // Machinery selection
    landPreparationMethod: 'manual',
    harvestingMethod: 'manual',
    
    // Minimum wage
    useMinimumWage: false,
  });
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [projection, setProjection] = useState<ProjectionYear[] | null>(null);
  const [projectionVisible, setProjectionVisible] = useState(false);

  const alertRef = useRef<AlertPro>(null);
  const [alertState, setAlertState] = useState<{
    title: string;
    message: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
    autoCloseMs?: number;
  } | null>(null);

  const openAlert = (cfg: typeof alertState) => {
    setAlertState(cfg);
    requestAnimationFrame(() => alertRef.current?.open());
    if (cfg && !cfg.showCancel && !cfg.onConfirm) {
      const ms = cfg.autoCloseMs ?? 3000;
      setTimeout(() => alertRef.current?.close(), ms);
    }
  };

  const showSuccessAlert = (title: string, message: string) =>
    openAlert({ title, message, autoCloseMs: 2500 });
  const showErrorAlert = (title: string, message: string) =>
    openAlert({ title, message, autoCloseMs: 4000 });
  const showWarningAlert = (title: string, message: string) =>
    openAlert({ title, message, autoCloseMs: 3000 });
  const showInfoAlert = (title: string, message: string) =>
    openAlert({ title, message, autoCloseMs: 3000 });

  const showConfirmationAlert = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => openAlert({ title, message, showCancel: true, onConfirm, onCancel });

  useEffect(() => {
    const getToken = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          setAccessToken(token);
        }
      } catch (error) {
        console.error('Error getting token:', error);
        showErrorAlert('Authentication Error', 'Failed to get authentication token');
      }
    };
    getToken();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get<{ 
        success: boolean;
        message: string;
        count: number;
        pagination?: any;
        data: AgriculturePlan[];
      }>(
        `${Config.API_BASE_URL}/finance/agriculture-plans`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      
      if (response.data.success) {
        setPlans(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch plans');
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        showWarningAlert('Access Denied', 'You do not have permission to view these plans');
        return;
      }
      handleApiError(axiosError, 'fetching plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchData();
    }
  }, [accessToken]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const fetchMarketPrices = async (commodity: string, category: string) => {
    try {
      const response = await axios.get<MarketPrice[]>(
        `${Config.API_BASE_URL}/market/prices`,
        {
          params: { commodity, category },
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      
      if (response.data && response.data.length > 0) {
        setMarketPrices(response.data);
        setPriceModalVisible(true);
      } else {
        showInfoAlert('Market Prices', 'No market prices available for this commodity');
      }
    } catch (error) {
      handleApiError(error as AxiosError, 'fetching market prices');
    }
  };

  const handleApiError = (error: AxiosError, context: string) => {
    console.error(`Error ${context}:`, error);
    
    let errorTitle = 'Error';
    let errorMessage = `Error ${context}`;
    
    if (error.response) {
      console.log('Response data:', error.response.data);
      console.log('Response status:', error.response.status);
      
      if (error.response.status === 401) {
        errorTitle = 'Session Expired';
        errorMessage = 'Please login again to continue.';
      } else if (error.response.status === 404) {
        errorTitle = 'Not Found';
        errorMessage = 'API endpoint not found. Please check the URL.';
      } else if (error.response.data && typeof error.response.data === 'object') {
        errorMessage = (error.response.data as { message?: string, error?: string }).message || 
                      (error.response.data as { error?: string }).error || 
                      errorMessage;
      }
    } else if (error.request) {
      errorTitle = 'Network Error';
      errorMessage = 'Could not connect to server. Please check your internet connection.';
    }

    showErrorAlert(errorTitle, errorMessage);
  };

  const handleInputChange = <K extends keyof FormData>(name: K, value: FormData[K]) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      if (name === 'cropType' && newData.agricultureType === 'crop') {
        const duration = CROP_DURATION_DATA[value as string] || CROP_DURATION_DATA.other;
        newData.durationMonths = duration.toString();
      } else if (name === 'animalType' && newData.agricultureType === 'livestock') {
        const duration = LIVESTOCK_DURATION_DATA[value as string] || LIVESTOCK_DURATION_DATA.other;
        newData.durationMonths = duration.toString();
      } else if (name === 'birdType' && newData.agricultureType === 'poultry') {
        const duration = POULTRY_DURATION_DATA[value as string] || POULTRY_DURATION_DATA.other;
        newData.durationMonths = duration.toString();
        
        // Auto-set production type based on bird type
        if (['broilers', 'turkey', 'duck'].includes(value as string)) {
          newData.productionType = 'meat';
        } else {
          newData.productionType = 'egg';
        }
      }
      
      return newData;
    });
  };

  const handleGetMarketPrice = () => {
    let commodity = '';
    let category = '';
    
    switch(formData.agricultureType) {
      case 'crop':
        if (!formData.cropType.trim()) {
          showWarningAlert('Missing Information', 'Please select crop type first');
          return;
        }
        commodity = formData.cropType;
        category = 'crop';
        break;
      case 'livestock':
        if (!formData.animalType.trim()) {
          showWarningAlert('Missing Information', 'Please select animal type first');
          return;
        }
        commodity = formData.animalType;
        category = 'livestock';
        break;
      case 'poultry':
        if (!formData.birdType.trim()) {
          showWarningAlert('Missing Information', 'Please select bird type first');
          return;
        }
        
        // For poultry, determine if we need egg or meat price
        if (formData.productionType === 'meat') {
          commodity = formData.birdType;
          category = 'poultry';
        } else {
          commodity = 'egg';
          category = 'poultry';
        }
        break;
    }
    
    fetchMarketPrices(commodity, category);
  };

  const handleSelectPrice = (price: number) => {
    if (isNaN(price)) {
      showErrorAlert('Invalid Price', 'Invalid price selected. Please try again.');
      return;
    }
    setSelectedPrice(price);
    setPriceModalVisible(false);
    showSuccessAlert('Price Selected', `Market price of GHC${price.toFixed(2)} has been selected`);
  };

  const validateForm = () => {
    if (!formData.planName.trim()) {
      showWarningAlert('Validation Error', 'Please enter a plan name');
      return false;
    }

    if (!formData.durationMonths || parseInt(formData.durationMonths) <= 0) {
      showWarningAlert('Validation Error', 'Please enter a valid duration (at least 1 month)');
      return false;
    }

    switch(formData.agricultureType) {
      case 'crop':
        if (!formData.cropType.trim() || 
            parseFloat(formData.landSize) <= 0) {
          showWarningAlert('Validation Error', 'Please fill required crop fields with valid values');
          return false;
        }
        
        // Only require costPerUnit if not owning land
        if (formData.landOwnershipType !== 'own') {
          if (!formData.costPerUnit || parseFloat(formData.costPerUnit) <= 0) {
            showWarningAlert('Validation Error', 'Please enter operational costs for land preparation');
            return false;
          }
        }
        
        if (!formData.landOwnershipType) {
          showWarningAlert('Validation Error', 'Please select land ownership type');
          return false;
        }
        
        if (formData.landOwnershipType === 'buy') {
          if (!formData.landPurchasePrice || parseFloat(formData.landPurchasePrice) <= 0) {
            showWarningAlert('Validation Error', 'Please enter a valid land purchase price');
            return false;
          }
        }
        
        if (formData.landOwnershipType === 'rent') {
          if (!formData.landRentPerMonth || parseFloat(formData.landRentPerMonth) <= 0) {
            showWarningAlert('Validation Error', 'Please enter a valid land rent amount');
            return false;
          }
        }
        break;
      case 'livestock':
        if (!formData.animalType.trim() || 
            parseInt(formData.numberOfAnimals) <= 0 || 
            parseFloat(formData.costPerAnimal) <= 0) {
          showWarningAlert('Validation Error', 'Please fill required livestock fields with valid values');
          return false;
        }
        break;
      case 'poultry':
        if (!formData.birdType.trim() || 
            parseInt(formData.numberOfBirds) <= 0 || 
            parseFloat(formData.costPerBird) <= 0) {
          showWarningAlert('Validation Error', 'Please fill required poultry fields with valid values');
          return false;
        }
        break;
    }

    if (!selectedPrice && selectedPrice !== 0) {
      showWarningAlert('Validation Error', 'Please select a market price');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Clone and normalize payload for backend expectations
      const investmentDetails: any = {
        ...formData
      };

      // Remove top-level fields not part of investmentDetails
      delete investmentDetails.planName;
      delete investmentDetails.agricultureType;
      delete investmentDetails.durationMonths;
      delete investmentDetails.notes;
      delete investmentDetails.useMinimumWage;

      // Ensure costPerUnit has a default value when empty for owned land
      if (formData.landOwnershipType === 'own' && (!formData.costPerUnit || formData.costPerUnit.trim() === '')) {
        investmentDetails.costPerUnit = '0';
      }

      // Normalize land unit key to backend converter keys
      if (investmentDetails.landUnit === 'squareMeters') {
        investmentDetails.landUnit = 'squaremeters';
      }

      // IMPORTANT: Add market price to investmentDetails based on agriculture type
      if (formData.agricultureType === 'crop') {
        investmentDetails.marketPricePerKg = selectedPrice;
      } else if (formData.agricultureType === 'livestock') {
        investmentDetails.marketPricePerKg = selectedPrice;
      } else if (formData.agricultureType === 'poultry') {
        if (formData.productionType === 'egg') {
          investmentDetails.eggPrice = selectedPrice;
        } else {
          investmentDetails.marketPricePerKg = selectedPrice;
        }
      }

      const response = await axios.post<{
        success: boolean;
        message: string;
        data: AgriculturePlan;
      }>(
        `${Config.API_BASE_URL}/finance/agriculture-plans`,
        {
          planName: formData.planName,
          agricultureType: formData.agricultureType,
          investmentDetails,
          durationMonths: parseInt(formData.durationMonths) || 12,
          notes: formData.notes,
          marketPrice: selectedPrice // Pass market price at top level as well
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.data.success) {
        showSuccessAlert('Success!', 'Your agriculture plan has been created successfully');
        setCalculationResult(response.data.data.calculation);
        setResultModalVisible(true);
        fetchData();
        resetForm();
      } else {
        throw new Error(response.data.message || 'Failed to create plan');
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        showWarningAlert('Access Denied', 'You do not have permission to create plans');
        return;
      }
      handleApiError(axiosError, 'creating plan');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      planName: '',
      agricultureType: 'crop',
      durationMonths: '',
      notes: '',
      landSize: '',
      landUnit: 'acres',
      cropType: '',
      costPerUnit: '',
      animalType: '',
      numberOfAnimals: '',
      costPerAnimal: '',
      birdType: '',
      numberOfBirds: '',
      costPerBird: '',
      productionType: 'egg',
      soilQuality: '',
      irrigationQuality: '',
      climateQuality: '',
      feedQuality: '',
      breedQuality: '',
      purchaseAgeMonths: '',
      purchaseWeightKg: '',
      landOwnershipType: 'own',
      landPurchasePrice: '',
      landRentPerMonth: '',
      laborCostPerMonth: '',
      fertilizerCost: '',
      pesticideCost: '',
      irrigationCost: '',
      landPreparationMethod: 'manual',
      harvestingMethod: 'manual',
      useMinimumWage: false,
      seedCost: '', // Reset seed cost
    });
    setSelectedPrice(null);
  };

  const handleDeletePlan = async (planId: string) => {
    showConfirmationAlert(
      'Delete Plan',
      'Are you sure you want to delete this plan? This action cannot be undone.',
      async () => {
        try {
          setLoading(true);
          
          // Log the request details for debugging
          console.log('Deleting plan:', {
            url: `${Config.API_BASE_URL}/finance/agriculture-plans/${planId}`,
            planId,
            accessToken: accessToken ? 'Present' : 'Missing'
          });

          const response = await axios.delete(
            `${Config.API_BASE_URL}/finance/agriculture-plans/${planId}`,
            { 
              headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000 // Add 10 second timeout
            }
          );

          console.log('Delete response:', response.data);
          
          showSuccessAlert('Deleted', 'Plan deleted successfully');
          fetchData();
        } catch (error) {
          const axiosError = error as AxiosError;
          
          // Enhanced error logging
          console.error('Delete plan error details:', {
            message: axiosError.message,
            code: axiosError.code,
            response: axiosError.response?.data,
            status: axiosError.response?.status,
            url: axiosError.config?.url
          });

          // More specific error handling
          if (axiosError.code === 'ECONNABORTED') {
            showErrorAlert('Timeout Error', 'The request took too long. Please check your connection and try again.');
          } else if (axiosError.code === 'ERR_NETWORK') {
            showErrorAlert('Network Error', 'Cannot connect to server. Please check:\n\n1. Your internet connection\n2. Server is running\n3. API URL is correct');
          } else {
            handleApiError(axiosError, "deleting plan");
          }
        } finally {
          setLoading(false);
        }
      }
    );
  };

  // Add helper function for safe number formatting
  const formatCurrency = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00';
    }
    return Number(value).toFixed(decimals);
  };

  const renderFormFields = () => {
    const priceLabel = formData.agricultureType === 'poultry' 
      ? (formData.productionType === 'meat' ? 'per kg' : 'per egg')
      : 'per kg';
    
    return (
      <>
        {formData.agricultureType === 'crop' && (
          <>
            <View style={styles.inputContainer}>
              <Icon name="grass" size={20} color="#666" style={styles.inputIcon} />
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                data={cropTypes}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select Crop Type"
                searchPlaceholder="Search..."
                value={formData.cropType}
                onChange={(item) => handleInputChange('cropType', item.value)}
                renderLeftIcon={() => null}
              />
            </View>
            
            <View style={styles.row}>
              <View style={[styles.inputContainer, {flex: 2}]}>
                <Icon name="square-foot" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Land Size"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={formData.landSize}
                  onChangeText={(text) => handleInputChange('landSize', text)}
                />
              </View>
              
              <View style={[styles.inputContainer, {flex: 1}]}>
                <Picker
                  style={styles.picker}
                  dropdownIconColor="#666"
                  selectedValue={formData.landUnit}
                  onValueChange={(value: 'acres' | 'hectares' | 'squareMeters') => 
                    handleInputChange('landUnit', value)
                  }>
                  <Picker.Item label="Acres" value="acres" />
                  <Picker.Item label="Hectares" value="hectares" />
                  <Picker.Item label="Sq Meters" value="squareMeters" />
                </Picker>
              </View>
            </View>
            
            {/* Only show cost per unit if not owning land */}
            {formData.landOwnershipType !== 'own' && (
              <View style={styles.inputContainer}>
                <Icon name="savings" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Land Preparation Cost per Acre (GHC)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={formData.costPerUnit}
                  onChangeText={(text) => handleInputChange('costPerUnit', text)}
                />
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <Icon name="assessment" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Expected Yield per Acre (kg) - Optional"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.expectedYieldPerUnit}
                onChangeText={(text) => handleInputChange('expectedYieldPerUnit', text)}
              />
            </View>
            
            <Text style={styles.sectionSubtitle}>Quality Factors (1-5)</Text>
            
            <View style={styles.qualityRow}>
              <View style={styles.qualityInputContainer}>
                <Text style={styles.qualityLabel}>Soil</Text>
                <TextInput
                  style={styles.qualityInput}
                  placeholder="1-5"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={formData.soilQuality}
                  onChangeText={(text) => handleInputChange('soilQuality', text)}
                  maxLength={1}
                />
              </View>
              
              <View style={styles.qualityInputContainer}>
                <Text style={styles.qualityLabel}>Irrigation</Text>
                <TextInput
                  style={styles.qualityInput}
                  placeholder="1-5"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={formData.irrigationQuality}
                  onChangeText={(text) => handleInputChange('irrigationQuality', text)}
                  maxLength={1}
                />
              </View>
              
              <View style={styles.qualityInputContainer}>
                <Text style={styles.qualityLabel}>Climate</Text>
                <TextInput
                  style={styles.qualityInput}
                  placeholder="1-5"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={formData.climateQuality}
                  onChangeText={(text) => handleInputChange('climateQuality', text)}
                  maxLength={1}
                />
              </View>
            </View>

            {/* Enhanced Operational Costs Section */}
            <Text style={styles.sectionSubtitle}>Operational Costs (per acre per month)</Text>

            {/* Minimum Wage Option */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => {
                  const useMinWage = !formData.useMinimumWage;
                  handleInputChange('useMinimumWage', useMinWage);
                  if (useMinWage) {
                    // Auto-calculate based on minimum wage
                    const calculatedLabor = Math.round(MINIMUM_WAGE_DATA.monthly / 20 * 1.5); // 1.5 workers per acre
                    handleInputChange('laborCostPerMonth', calculatedLabor.toString());
                  }
                }}
              >
                <Icon 
                  name={formData.useMinimumWage ? "check-box" : "check-box-outline-blank"} 
                  size={20} 
                  color="#4CAF50" 
                />
                <Text style={styles.checkboxLabel}>
                  Calculate labor cost based on Ghana minimum wage (GHC {MINIMUM_WAGE_DATA.monthly}/month)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Labor Cost */}
            <View style={styles.inputContainer}>
              <Icon name="engineering" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Labor Cost per acre/month (GHC)"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.laborCostPerMonth}
                onChangeText={(text) => handleInputChange('laborCostPerMonth', text)}
              />
              <Text style={styles.costHint}>
                {formData.useMinimumWage ? 'Based on min wage' : 'Custom amount'}
              </Text>
            </View>

            {/* Fertilizer Cost */}
            <View style={styles.inputContainer}>
              <Icon name="grass" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Fertilizer Cost per acre/life cycle (GHC)"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.fertilizerCost}
                onChangeText={(text) => handleInputChange('fertilizerCost', text)}
              />
            </View>

            {/* Pesticide Cost */}
            <View style={styles.inputContainer}>
              <Icon name="bug-report" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Pesticide Cost per acre/life cycle (GHC)"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.pesticideCost}
                onChangeText={(text) => handleInputChange('pesticideCost', text)}
              />
            </View>

            {/* Irrigation Cost */}
            <View style={styles.inputContainer}>
              <Icon name="water-drop" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Irrigation Cost per acre/month (GHC)"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.irrigationCost}
                onChangeText={(text) => handleInputChange('irrigationCost', text)}
              />
            </View>

            {/* Seed Cost Input */}
            <View style={styles.inputContainer}>
              <Icon name="eco" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Seed Cost per Acre (GHC) - Optional"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.seedCost}
                onChangeText={(text) => handleInputChange('seedCost', text)}
              />
            </View>
            
            {/* Info text for seed cost */}
            {!formData.seedCost && (
              <View style={styles.infoContainer}>
                <Icon name="info" size={18} color="#2196F3" />
                <Text style={styles.infoText}>
                  Default seed cost will be used based on crop type if not specified
                </Text>
              </View>
            )}

            {/* Machinery Selection */}
            <Text style={styles.sectionSubtitle}>Machinery & Equipment</Text>

            {/* Land Preparation Method */}
            <View style={styles.inputContainer}>
              <Icon name="agriculture" size={20} color="#666" style={styles.inputIcon} />
              <Dropdown
                style={styles.dropdown}
                data={landPreparationMethods}
                labelField="label"
                valueField="value"
                placeholder="Select Land Preparation Method"
                value={formData.landPreparationMethod}
                onChange={(item) => handleInputChange('landPreparationMethod', item.value)}
              />
            </View>

            {/* Harvesting Method */}
            <View style={styles.inputContainer}>
              <Icon name="agriculture" size={20} color="#666" style={styles.inputIcon} />
              <Dropdown
                style={styles.dropdown}
                data={harvestingMethods}
                labelField="label"
                valueField="value"
                placeholder="Select Harvesting Method"
                value={formData.harvestingMethod}
                onChange={(item) => handleInputChange('harvestingMethod', item.value)}
              />
            </View>
          </>
        )}

        {formData.agricultureType === 'livestock' && (
          <>
            <View style={styles.inputContainer}>
              <Icon name="pets" size={20} color="#666" style={styles.inputIcon} />
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                data={animalTypes}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select Animal Type"
                searchPlaceholder="Search..."
                value={formData.animalType}
                onChange={(item) => handleInputChange('animalType', item.value)}
                renderLeftIcon={() => null}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Icon name="format-list-numbered" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Number of Animals"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.numberOfAnimals}
                onChangeText={(text) => handleInputChange('numberOfAnimals', text)}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Icon name="savings" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Cost per Animal (GHC)"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.costPerAnimal}
                onChangeText={(text) => handleInputChange('costPerAnimal', text)}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Icon name="fitness-center" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Expected Weight (kg) - Optional"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.expectedWeightPerAnimal}
                onChangeText={(text) => handleInputChange('expectedWeightPerAnimal', text)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Icon name="hourglass-bottom" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Purchase Age (months) - Optional"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.purchaseAgeMonths}
                onChangeText={(text) => handleInputChange('purchaseAgeMonths', text)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Icon name="monitor-weight" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Weight at Purchase (kg) - Optional"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.purchaseWeightKg}
                onChangeText={(text) => handleInputChange('purchaseWeightKg', text)}
              />
            </View>
            
            <Text style={styles.sectionSubtitle}>Quality Factors (1-5)</Text>
            
            <View style={styles.qualityRow}>
              <View style={styles.qualityInputContainer}>
                <Text style={styles.qualityLabel}>Feed</Text>
                <TextInput
                  style={styles.qualityInput}
                  placeholder="1-5"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={formData.feedQuality}
                  onChangeText={(text) => handleInputChange('feedQuality', text)}
                  maxLength={1}
                />
              </View>
              
              <View style={styles.qualityInputContainer}>
                <Text style={styles.qualityLabel}>Breed</Text>
                <TextInput
                  style={styles.qualityInput}
                  placeholder="1-5"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={formData.breedQuality}
                  onChangeText={(text) => handleInputChange('breedQuality', text)}
                  maxLength={1}
                />
              </View>
            </View>
          </>
        )}

        {formData.agricultureType === 'poultry' && (
          <>
            <View style={styles.inputContainer}>
              <Icon name="egg" size={20} color="#666" style={styles.inputIcon} />
              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                data={birdTypes}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select Bird Type"
                searchPlaceholder="Search..."
                value={formData.birdType}
                onChange={(item) => handleInputChange('birdType', item.value)}
                renderLeftIcon={() => null}
              />
            </View>

            {/* Production Type Selection for Chicken */}
            {formData.birdType === 'chicken' && (
              <View style={styles.inputContainer}>
                <Icon name="settings" size={20} color="#666" style={styles.inputIcon} />
                <Dropdown
                  style={styles.dropdown}
                  data={productionTypes}
                  labelField="label"
                  valueField="value"
                  placeholder="Select Production Type"
                  value={formData.productionType}
                  onChange={(item) => handleInputChange('productionType', item.value)}
                />
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <Icon name="format-list-numbered" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Number of Birds"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.numberOfBirds}
                onChangeText={(text) => handleInputChange('numberOfBirds', text)}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Icon name="money" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Cost per Bird (GHC)"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.costPerBird}
                onChangeText={(text) => handleInputChange('costPerBird', text)}
              />
            </View>
            
            {formData.productionType === 'egg' && (
              <View style={styles.inputContainer}>
                <Icon name="egg" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Eggs per Bird per Month - Optional"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={formData.eggsPerBirdPerMonth}
                  onChangeText={(text) => handleInputChange('eggsPerBirdPerMonth', text)}
                />
              </View>
            )}

            {formData.productionType === 'meat' && (
              <View style={styles.inputContainer}>
                <Icon name="fitness-center" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Expected Weight per Bird (kg) - Optional"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={formData.expectedWeightPerAnimal}
                  onChangeText={(text) => handleInputChange('expectedWeightPerAnimal', text)}
                />
              </View>
            )}
            
            <Text style={styles.sectionSubtitle}>Quality Factors (1-5)</Text>
            
            <View style={styles.qualityRow}>
              <View style={styles.qualityInputContainer}>
                <Text style={styles.qualityLabel}>Feed</Text>
                <TextInput
                  style={styles.qualityInput}
                  placeholder="1-5"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={formData.feedQuality}
                  onChangeText={(text) => handleInputChange('feedQuality', text)}
                  maxLength={1}
                />
              </View>
              
              <View style={styles.qualityInputContainer}>
                <Text style={styles.qualityLabel}>Breed</Text>
                <TextInput
                  style={styles.qualityInput}
                  placeholder="1-5"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={formData.breedQuality}
                  onChangeText={(text) => handleInputChange('breedQuality', text)}
                  maxLength={1}
                />
              </View>
            </View>
          </>
        )}

        {/* Enhanced Land Ownership Section */}
        <Text style={styles.sectionSubtitle}>Land Ownership</Text>
        <View style={styles.inputContainer}>
          <Icon name="home" size={20} color="#666" style={styles.inputIcon} />
          <Dropdown
            style={styles.dropdown}
            data={landOwnershipOptions}
            labelField="label"
            valueField="value"
            placeholder="Select Land Ownership"
            value={formData.landOwnershipType}
            onChange={(item) => {
              handleInputChange('landOwnershipType', item.value);
              // Reset dependent fields when ownership type changes
              if (item.value === 'own') {
                handleInputChange('landPurchasePrice', '');
                handleInputChange('landRentPerMonth', '');
                handleInputChange('costPerUnit', ''); // Clear land prep cost when owning
              }
            }}
          />
        </View>

        {formData.landOwnershipType === 'buy' && (
          <View style={styles.inputContainer}>
            <Icon name="attach-money" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Land Purchase Price (GHC)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formData.landPurchasePrice}
              onChangeText={(text) => handleInputChange('landPurchasePrice', text)}
            />
          </View>
        )}

        {formData.landOwnershipType === 'rent' && (
          <View style={styles.inputContainer}>
            <Icon name="money" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Land Rent per Month (GHC)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formData.landRentPerMonth}
              onChangeText={(text) => handleInputChange('landRentPerMonth', text)}
            />
          </View>
        )}

        {/* Show informational message when owning land */}
        {formData.agricultureType === 'crop' && formData.landOwnershipType === 'own' && (
          <View style={styles.infoContainer}>
            <Icon name="info" size={18} color="#2196F3" />
            <Text style={styles.infoText}>
              Only operational costs (seeds, fertilizer, labor) will be included. No land costs.
            </Text>
          </View>
        )}

        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>
            {selectedPrice !== null ? 
              `Market Price: GHC${selectedPrice.toFixed(2)} ${priceLabel}` : 
              'No market price selected'}
          </Text>
          <TouchableOpacity 
            style={styles.priceButton}
            onPress={handleGetMarketPrice} 
            disabled={!formData[formData.agricultureType === 'crop' ? 'cropType' : 
                      formData.agricultureType === 'livestock' ? 'animalType' : 'birdType']}
          >
            <Icon name="search" size={20} color="#fff" />
            <Text style={styles.priceButtonText}>Get Market Price</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderPlanItem = ({ item }: { item: AgriculturePlan }) => (
    <View style={styles.planItem}>
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{item.planName || 'Unnamed Plan'}</Text>
        <View style={styles.planTypeContainer}>
          <Text style={styles.planType}>
            {(item.agricultureType || 'crop').toUpperCase()}
          </Text>
          <Text style={styles.planDuration}>
            {item.durationMonths || 0} months
          </Text>
        </View>
      </View>
      
      <View style={styles.planDetails}>
        <View style={styles.planDetailRow}>
          <Icon name="savings" size={16} color="#666" />
          <Text style={styles.planDetailText}>
            Investment: <Text style={styles.planDetailValue}>
              GHC{formatCurrency(item.calculation?.totalInvestment)}
            </Text>
          </Text>
        </View>
        
        <View style={styles.planDetailRow}>
          <Icon name="trending-up" size={16} color="#666" />
          <Text style={styles.planDetailText}>
            Revenue: <Text style={styles.planDetailValue}>
              GHC{formatCurrency(item.calculation?.expectedRevenue)}
            </Text>
          </Text>
        </View>
        
        <View style={styles.planDetailRow}>
          <Icon name="shopping-cart" size={16} color="#666" />
          <Text style={styles.planDetailText}>
            Market Price: <Text style={styles.planDetailValue}>
              GHC{formatCurrency(
                (item.calculation?.metrics as any)?.marketPriceUsed ??
                item.marketPriceUsed ??
                0
              )} {item.calculation?.metrics?.priceUnit || 
                (item.agricultureType === 'poultry' ? 
                  (item.calculation?.metrics?.productionType === 'meat' ? 'per kg' : 'per egg') 
                  : 'per kg')}
            </Text>
          </Text>
        </View>

        {/* Show production details for poultry */}
        {item.agricultureType === 'poultry' && item.calculation?.metrics && (
          <View style={styles.planDetailRow}>
            <Icon name="info" size={16} color="#666" />
            <Text style={styles.planDetailText}>
              Production: <Text style={styles.planDetailValue}>
                {item.calculation.metrics.productionType === 'meat' ? 'Meat' : 'Eggs'} 
                {item.calculation.metrics.totalProduction && ` (${item.calculation.metrics.totalProduction})`}
                {item.calculation.metrics.survivingBirds && ` | ${item.calculation.metrics.survivingBirds} birds`}
              </Text>
            </Text>
          </View>
        )}
        
        <View style={styles.planDetailRow}>
          <Icon name="assessment" size={16} color={(item.calculation?.profit || 0) >= 0 ? '#4CAF50' : '#f44336'} />
          <Text style={[
            styles.planDetailText,
            (item.calculation?.profit || 0) >= 0 ? styles.profitText : styles.lossText
          ]}>
            Profit: <Text style={styles.planDetailValue}>
              GHC{formatCurrency(item.calculation?.profit)} 
              (ROI: {formatCurrency(item.calculation?.roi)}%)
            </Text>
          </Text>
        </View>

        {/* Enhanced: Show land ownership info if available */}
        {item.calculation?.metrics?.landOwnershipType && (
          <View style={styles.planDetailRow}>
            <Icon name="home" size={16} color="#666" />
            <Text style={styles.planDetailText}>
              Land: <Text style={styles.planDetailValue}>
                {item.calculation.metrics.landOwnershipType === 'own' ? 'Owned' :
                 item.calculation.metrics.landOwnershipType === 'buy' ? 'Buying' : 'Renting'}
                {item.calculation.metrics.landCost && item.calculation.metrics.landCost > 0 
                  ? ` (GHC${formatCurrency(item.calculation.metrics.landCost)})` 
                  : ' (No land cost)'}
              </Text>
            </Text>
          </View>
        )}

        {/* Enhanced: Show machinery info if available */}
        {item.calculation?.metrics?.userConfig && (
          <View style={styles.planDetailRow}>
            <Icon name="agriculture" size={16} color="#666" />
            <Text style={styles.planDetailText}>
              Method: <Text style={styles.planDetailValue}>
                {item.calculation.metrics.userConfig.landPreparationMethod === 'manual' ? 'Manual Labor' :
                 item.calculation.metrics.userConfig.landPreparationMethod === 'tractor' ? 'Tractor Services' : 'Full Machinery'}
              </Text>
            </Text>
          </View>
        )}

        {/* Show seed cost if available */}
        {item.calculation?.metrics?.userConfig?.seedCostPerAcre && (
          <View style={styles.planDetailRow}>
            <Icon name="eco" size={16} color="#666" />
            <Text style={styles.planDetailText}>
              Seed Cost: <Text style={styles.planDetailValue}>
                GHC{formatCurrency(item.calculation.metrics.userConfig.seedCostPerAcre)}/acre
              </Text>
            </Text>
          </View>
        )}

        {/* Show total seed cost if available */}
        {item.calculation?.metrics?.costBreakdown?.totalSeedCost && (
          <View style={styles.planDetailRow}>
            <Icon name="eco" size={16} color="#666" />
            <Text style={styles.planDetailText}>
              Total Seed Cost: <Text style={styles.planDetailValue}>
                GHC{formatCurrency(item.calculation.metrics.costBreakdown.totalSeedCost)}
              </Text>
            </Text>
          </View>
        )}
      </View>
      
      {item.notes && (
        <View style={styles.notesContainer}>
          <Icon name="notes" size={16} color="#666" />
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeletePlan(item._id)}
      >
        <Icon name="delete" size={20} color="#f44336" />
      </TouchableOpacity>
    </View>
  );

  const handleProjectFiveYears = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const investmentDetails: any = {
        ...formData,
      };
      
      // Ensure costPerUnit has a default value when empty for owned land
      if (formData.landOwnershipType === 'own' && (!formData.costPerUnit || formData.costPerUnit.trim() === '')) {
        investmentDetails.costPerUnit = '0';
      }
      
      if (investmentDetails.landUnit === 'squareMeters') {
        investmentDetails.landUnit = 'squaremeters';
      }
      delete investmentDetails.planName;
      delete investmentDetails.agricultureType;
      delete investmentDetails.durationMonths;
      delete investmentDetails.notes;
      delete investmentDetails.useMinimumWage;

      const resp = await axios.post<{
        success: boolean;
        data: { years: ProjectionYear[]; totals: any; finalCumulativeProfit: number };
      }>(
        `${Config.API_BASE_URL}/finance/agriculture-plans/projection`,
        {
          agricultureType: formData.agricultureType,
          investmentDetails,
          durationMonths: parseInt(formData.durationMonths) || 12,
          years: 5,
          marketPrice: selectedPrice
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (resp.data.success) {
        setProjection(resp.data.data.years);
        setProjectionVisible(true);
      } else {
        showErrorAlert('Projection Failed', 'Could not generate projection');
      }
    } catch (error) {
      handleApiError(error as AxiosError, 'generating projection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Agriculture Profit Calculator</Text>
          <Text style={styles.subtitle}>Plan your agricultural investments with confidence</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              formData.agricultureType === 'crop' && styles.activeTab
            ]}
            onPress={() => {
              handleInputChange('agricultureType', 'crop');
              setSelectedPrice(null);
            }}
          >
            <Icon 
              name="spa" 
              size={20} 
              color={formData.agricultureType === 'crop' ? '#fff' : '#4CAF50'} 
            />
            <Text style={[
              styles.tabButtonText,
              formData.agricultureType === 'crop' && styles.activeTabText
            ]}>
              Crop
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tabButton,
              formData.agricultureType === 'livestock' && styles.activeTab
            ]}
            onPress={() => {
              handleInputChange('agricultureType', 'livestock');
              setSelectedPrice(null);
            }}
          >
            <Icon 
              name="pets" 
              size={20} 
              color={formData.agricultureType === 'livestock' ? '#fff' : '#4CAF50'} 
            />
            <Text style={[
              styles.tabButtonText,
              formData.agricultureType === 'livestock' && styles.activeTabText
            ]}>
              Livestock
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tabButton,
              formData.agricultureType === 'poultry' && styles.activeTab
            ]}
            onPress={() => {
              handleInputChange('agricultureType', 'poultry');
              setSelectedPrice(null);
            }}
          >
            <Icon 
              name="egg" 
              size={20} 
              color={formData.agricultureType === 'poultry' ? '#fff' : '#4CAF50'} 
            />
            <Text style={[
              styles.tabButtonText,
              formData.agricultureType === 'poultry' && styles.activeTabText
            ]}>
              Poultry
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>
            {formData.agricultureType.charAt(0).toUpperCase() + formData.agricultureType.slice(1)} Plan Details
          </Text>
          
          <View style={styles.inputContainer}>
            <Icon name="edit" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Plan Name"
              placeholderTextColor="#999"
              value={formData.planName}
              onChangeText={(text) => handleInputChange('planName', text)}
            />
          </View>
          
          {renderFormFields()}
          
          <View style={styles.inputContainer}>
            <Icon name="calendar-today" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Duration (months)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formData.durationMonths}
              onChangeText={(text) => handleInputChange('durationMonths', text)}
              editable={true}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Icon name="notes" size={20} color="#666" style={[styles.inputIcon, {alignSelf: 'flex-start', marginTop: 10}]} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional Notes"
              placeholderTextColor="#999"
              multiline
              value={formData.notes}
              onChangeText={(text) => handleInputChange('notes', text)}
            />
          </View>
          
          <TouchableOpacity
            style={styles.calculateButton}
            onPress={handleSubmit}
            disabled={loading || !accessToken || selectedPrice === null}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="calculate" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.calculateButtonText}>Calculate Profit</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.calculateButton, { marginTop: 12, backgroundColor: '#2E7D32' }]}
            onPress={handleProjectFiveYears}
            disabled={loading || !accessToken || selectedPrice === null}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="timeline" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.calculateButtonText}>5-Year Projection</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.plansContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Saved Plans</Text>
            <TouchableOpacity onPress={fetchData} style={styles.refreshButton}>
              <Icon name="refresh" size={20} color="#4CAF50" />
            </TouchableOpacity>
          </View>
          
          {!accessToken ? (
            <View style={styles.authContainer}>
              <Icon name="lock" size={30} color="#666" />
              <Text style={styles.authMessage}>Please login to view your plans</Text>
            </View>
          ) : loading && !refreshing ? (
            <ActivityIndicator size="large" color="#4CAF50" />
          ) : plans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="inventory" size={40} color="#ccc" />
              <Text style={styles.noPlansText}>No plans found</Text>
              <Text style={styles.noPlansSubtext}>Create your first plan above</Text>
            </View>
          ) : (
            <FlatList
              data={plans}
              scrollEnabled={false}
              keyExtractor={(item) => item._id || Math.random().toString()}
              renderItem={renderPlanItem}
            />
          )}
        </View>

        <Modal
          visible={priceModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setPriceModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Market Price</Text>
                <TouchableOpacity onPress={() => setPriceModalVisible(false)}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              {marketPrices.length === 0 ? (
                <View style={styles.emptyModalContainer}>
                  <Icon name="error-outline" size={40} color="#ccc" />
                  <Text style={styles.noPricesText}>No market prices available</Text>
                </View>
              ) : (
                <FlatList
                  data={marketPrices}
                  keyExtractor={(item) => item._id || Math.random().toString()} 
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.priceItem}
                      onPress={() => handleSelectPrice(item.price)}
                    >
                      <View style={styles.priceItemHeader}>
                        <Text style={styles.priceItemCommodity}>{item.commodity}</Text>
                        <Text style={styles.priceItemAmount}>GHC{item.price.toFixed(2)}/{item.unit}</Text>
                      </View>
                      <View style={styles.priceItemFooter}>
                        <Text style={styles.priceItemLocation}>
                          <Icon name="location-on" size={14} color="#666" /> {item.location}
                        </Text>
                        <Text style={styles.priceItemDate}>
                          <Icon name="event" size={14} color="#666" /> {new Date(item.date).toLocaleDateString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Results Modal */}
        <Modal
          visible={resultModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setResultModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Calculation Results</Text>
                <TouchableOpacity onPress={() => setResultModalVisible(false)}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.resultContainer}>
                {calculationResult && (
                  <>
                    <View style={styles.resultRow}>
                      <Icon name="savings" size={32} color="#4CAF50" />
                      <View style={styles.resultTextContainer}>
                        <Text style={styles.resultLabel}>Total Investment</Text>
                        <Text style={styles.resultValue}>
                          GHC{formatCurrency(calculationResult.totalInvestment)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.resultRow}>
                      <Icon name="trending-up" size={32} color="#2196F3" />
                      <View style={styles.resultTextContainer}>
                        <Text style={styles.resultLabel}>Expected Revenue</Text>
                        <Text style={styles.resultValue}>
                          GHC{formatCurrency(calculationResult.expectedRevenue)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.resultRow}>
                      <Icon name="account-balance" size={32} color={calculationResult.profit >= 0 ? '#4CAF50' : '#f44336'} />
                      <View style={styles.resultTextContainer}>
                        <Text style={styles.resultLabel}>Net Profit</Text>
                        <Text style={[
                          styles.resultValue,
                          calculationResult.profit >= 0 ? styles.profitText : styles.lossText
                        ]}>
                          GHC{formatCurrency(calculationResult.profit)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.resultRow}>
                      <Icon name="percent" size={32} color="#FF9800" />
                      <View style={styles.resultTextContainer}>
                        <Text style={styles.resultLabel}>Return on Investment (ROI)</Text>
                        <Text style={styles.resultValue}>
                          {formatCurrency(calculationResult.roi, 2)}%
                        </Text>
                      </View>
                    </View>

                    {calculationResult.breakEvenPoint && (
                      <View style={styles.resultRow}>
                        <Icon name="balance" size={32} color="#9C27B0" />
                        <View style={styles.resultTextContainer}>
                          <Text style={styles.resultLabel}>Break-Even Point</Text>
                          <Text style={styles.resultValue}>
                            {calculationResult.breakEvenPoint}
                          </Text>
                        </View>
                      </View>
                    )}

                    {calculationResult.metrics?.costBreakdown && (
                      <View style={[styles.resultRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Icon name="receipt" size={32} color="#666" />
                          <Text style={[styles.resultLabel, { marginLeft: 16 }]}>Cost Breakdown</Text>
                        </View>
                        <Text style={styles.costBreakdownText}>
                          Land: GHC{formatCurrency(calculationResult.metrics.costBreakdown.totalLandCost)}
                        </Text>
                        <Text style={styles.costBreakdownText}>
                          Operations: GHC{formatCurrency(calculationResult.metrics.costBreakdown.totalOperationalCost)}
                        </Text>
                        <Text style={styles.costBreakdownText}>
                          Machinery: GHC{formatCurrency(calculationResult.metrics.costBreakdown.totalMachineryCost)}
                        </Text>
                        {calculationResult.metrics.costBreakdown.totalSeedCost > 0 && (
                          <Text style={styles.costBreakdownText}>
                            Seeds: GHC{formatCurrency(calculationResult.metrics.costBreakdown.totalSeedCost)}
                          </Text>
                        )}
                      </View>
                    )}

                    {calculationResult.metrics?.detailedCosts && (
                      <View style={[styles.resultRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Icon name="analytics" size={32} color="#666" />
                          <Text style={[styles.resultLabel, { marginLeft: 16 }]}>Detailed Costs</Text>
                        </View>
                        <Text style={styles.costBreakdownText}>
                          Land Preparation: GHC{formatCurrency(calculationResult.metrics.detailedCosts.landPreparation)}
                        </Text>
                        {calculationResult.metrics.detailedCosts.seeds > 0 && (
                          <Text style={styles.costBreakdownText}>
                            Seeds (Total): GHC{formatCurrency(calculationResult.metrics.detailedCosts.seeds)}
                          </Text>
                        )}
                        <Text style={styles.costBreakdownText}>
                          Operational: GHC{formatCurrency(calculationResult.metrics.detailedCosts.operationalCosts)}
                        </Text>
                        <Text style={styles.costBreakdownText}>
                          Harvesting: GHC{formatCurrency(calculationResult.metrics.detailedCosts.harvesting)}
                        </Text>
                        {calculationResult.metrics.detailedCosts.financing > 0 && (
                          <Text style={styles.costBreakdownText}>
                            Financing: GHC{formatCurrency(calculationResult.metrics.detailedCosts.financing)}
                          </Text>
                        )}
                        <Text style={styles.costBreakdownText}>
                          Distribution: GHC{formatCurrency(calculationResult.metrics.detailedCosts.distribution)}
                        </Text>
                      </View>
                    )}

                    {calculationResult.metrics?.userConfig && (
                      <View style={[styles.resultRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Icon name="settings" size={32} color="#666" />
                          <Text style={[styles.resultLabel, { marginLeft: 16 }]}>Configuration</Text>
                        </View>
                        {calculationResult.metrics.userConfig.seedCostPerAcre && (
                          <Text style={styles.costBreakdownText}>
                            Seed Cost: GHC{formatCurrency(calculationResult.metrics.userConfig.seedCostPerAcre)}/acre
                          </Text>
                        )}
                        <Text style={styles.costBreakdownText}>
                          Labor: GHC{formatCurrency(calculationResult.metrics.userConfig.laborCostPerAcrePerMonth)}/acre/month
                        </Text>
                        <Text style={styles.costBreakdownText}>
                          Fertilizer: GHC{formatCurrency(calculationResult.metrics.userConfig.fertilizerCostPerAcrePerMonth)}/acre/month
                        </Text>
                        <Text style={styles.costBreakdownText}>
                          Pesticide: GHC{formatCurrency(calculationResult.metrics.userConfig.pesticideCostPerAcrePerMonth)}/acre/month
                        </Text>
                        <Text style={styles.costBreakdownText}>
                          Irrigation: GHC{formatCurrency(calculationResult.metrics.userConfig.irrigationCostPerAcrePerMonth)}/acre/month
                        </Text>
                        <Text style={styles.costBreakdownText}>
                          Land Prep: {calculationResult.metrics.userConfig.landPreparationMethod}
                        </Text>
                        <Text style={styles.costBreakdownText}>
                          Harvesting: {calculationResult.metrics.userConfig.harvestingMethod}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setResultModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Projection Modal */}
        <Modal
          visible={projectionVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setProjectionVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>5-Year Projection</Text>
                <TouchableOpacity onPress={() => setProjectionVisible(false)}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {projection && projection.length > 0 ? (
                <FlatList
                  data={[...projection].sort((a, b) => a.year - b.year)}
                  keyExtractor={(y) => String(y.year)}
                  renderItem={({ item }) => (
                    <View style={styles.priceItem}>
                      <View style={styles.priceItemHeader}>
                        <Text style={styles.priceItemCommodity}>
                          {ordinal(item.year)} Year
                        </Text>
                        <Text style={[
                          styles.priceItemAmount,
                          item.profit >= 0 ? styles.profitText : styles.lossText
                        ]}>
                          GHC{formatCurrency(item.profit)}
                        </Text>
                      </View>
                      <View style={styles.priceItemFooter}>
                        <Text style={styles.priceItemLocation}>
                          Investment: GHC{formatCurrency(item.totalInvestment)}
                        </Text>
                        <Text style={styles.priceItemDate}>
                          Revenue: GHC{formatCurrency(item.expectedRevenue)}
                        </Text>
                      </View>
                      <View style={styles.priceItemFooter}>
                        <Text style={styles.priceItemLocation}>
                          ROI: {formatCurrency(item.roi)}%
                        </Text>
                        <Text style={styles.priceItemDate}>
                          Cumulative: GHC{formatCurrency(item.cumulativeProfit)}
                        </Text>
                      </View>
                    </View>
                  )}
                />
              ) : (
                <View style={styles.emptyModalContainer}>
                  <Icon name="error-outline" size={40} color="#ccc" />
                  <Text style={styles.noPricesText}>No projection data available</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setProjectionVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>

      <AlertPro
        ref={alertRef}
        title={alertState?.title}
        message={alertState?.message}
        showCancel={!!alertState?.showCancel}
        textConfirm="OK"
        textCancel="Cancel"
        onConfirm={() => {
          alertState?.onConfirm?.();
          alertRef.current?.close();
        }}
        onCancel={() => {
          alertState?.onCancel?.();
          alertRef.current?.close();
        }}
        customStyles={{
          mask: { backgroundColor: 'rgba(0,0,0,0.5)' },
          container: { borderRadius: 14, padding: 20 },
          buttonConfirm: { backgroundColor: '#4CAF50' },
          buttonCancel: { backgroundColor: '#f44336' },
          title: { color: '#2E7D32' }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa'
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30
  },
  header: {
    marginBottom: 24,
    alignItems: 'center'
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity:  0.1,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabButtonText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontWeight: '500'
  },
  activeTabText: {
    color: '#fff'
  },
  formContainer: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 16
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 12,
    marginTop:  8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#333',
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  dropdown: {
    flex: 1,
    height: 48,
    backgroundColor: 'transparent',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#999',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#333',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
  iconStyle: {
    width: 24,
    height: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  qualityInputContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  qualityLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center'
  },
  qualityInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  picker: {
    flex: 1,
    height: 48,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 8,
  },
  priceLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  priceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
  },
  priceButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
    elevation: 3,
  },
  calculateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  plansContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    padding: 8,
  },
  planItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  planTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planType: {
    backgroundColor: '#e8f5e9',
    color: '#2E7D32',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  planDuration: {
    marginLeft: 8,
    color: '#666',
    fontSize: 12,
  },
  planDetails: {
    marginVertical: 8,
  },
  planDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  planDetailText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  planDetailValue: {
    fontWeight: '500',
    color: '#333',
  },
  profitText: {
    color: '#4CAF50',
  },
  lossText: {
    color: '#f44336',
  },
  notesContainer: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  notesText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    flex: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  authContainer: {
    alignItems: 'center',
    padding: 20,
  },
  authMessage: {
    marginTop: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noPlansText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  noPlansSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  priceItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  priceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceItemCommodity: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  priceItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  priceItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceItemLocation: {
    fontSize: 14,
    color: '#666',
  },
  priceItemDate: {
    fontSize: 14,
    color: '#666',
  },
  emptyModalContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noPricesText: {
    marginTop: 12,
    color: '#666',
    textAlign: 'center',
  },
  resultContainer: {
    padding: 16,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  costBreakdownText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modalCloseButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#1976D2',
    fontSize: 14,
    lineHeight: 18,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkboxLabel: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  costHint: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
    fontStyle: 'italic',
  },
});

export default ProfitCalculatorScreen;