import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Platform,
} from "react-native";
// Remove the Alert import as we'll replace it
import { Dropdown } from "react-native-element-dropdown";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar } from "react-native-calendars";
import Config from "../Config/config";
import DatePicker from 'react-native-date-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
// Import the new notification library
import AlertPro from 'react-native-alert-pro';

type WeatherAlert = {
  level: string;
  icon: string;
  description: string;
  action: string;
  parameter: string;
  message: string;
};

type MarkedDate = {
  marked: boolean;
  dotColor: string;
  selected: boolean;
  selectedColor: string;
};

type ScheduleItem = {
  date: string;
  activity: string;
  notes?: string[];
  weatherAlerts?: WeatherAlert[];
  status?: string;
  priority?: string;
  idealConditions?: string;
  bestPractices?: string;
  best_practices?: string;
  healthTips?: string;
  health_tips?: string;
};

type SavedSchedule = {
  _id: string;
  type: 'crop' | 'livestock' | 'poultry';
  name: string;
  location: string;
  startDate: string;
  createdAt: string;
  soilQuality?: string;
  managementSystem?: string;
  housingType?: string;
};

type DropdownData = {
  label: string;
  value: string;
};

const SmartCropCalendarScreen = () => {
  const [selectedForm, setSelectedForm] = useState<"crop" | "livestock" | "poultry">("crop");
  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState<Record<string, MarkedDate>>({});
  const [activitiesByDate, setActivitiesByDate] = useState<Record<string, any>>({});
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
  const [showSavedSchedules, setShowSavedSchedules] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Form states
  const [cropType, setCropType] = useState("");
  const [locationCrop, setLocationCrop] = useState("");
  const [soilQuality, setSoilQuality] = useState("");
  const [animalType, setAnimalType] = useState("");
  const [locationLivestock, setLocationLivestock] = useState("");
  const [managementSystem, setManagementSystem] = useState("");
  const [poultryType, setPoultryType] = useState("");
  const [locationPoultry, setLocationPoultry] = useState("");
  const [housingType, setHousingType] = useState("");

  // Dropdown data states
  const [cropTypes, setCropTypes] = useState<DropdownData[]>([]);
  const [soilQualities, setSoilQualities] = useState<DropdownData[]>([]);
  const [animalTypes, setAnimalTypes] = useState<DropdownData[]>([]);
  const [managementSystems, setManagementSystems] = useState<DropdownData[]>([]);
  const [poultryTypes, setPoultryTypes] = useState<DropdownData[]>([]);
  const [housingTypes, setHousingTypes] = useState<DropdownData[]>([]);
  const [locations, setLocations] = useState<DropdownData[]>([]);

  // Notification (AlertPro) state + ref
  const alertRef = useRef<any>(null);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    showCancel: boolean;
    confirmText: string;
    cancelText: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    autoClose?: number;
  }>({
    title: '',
    message: '',
    showCancel: false,
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: undefined,
    onCancel: undefined,
    autoClose: 0,
  });

  const showAlert = (cfg: Partial<typeof alertConfig>) => {
    const merged = {
      title: '',
      message: '',
      showCancel: false,
      confirmText: 'OK',
      cancelText: 'Cancel',
      autoClose: 0,
      ...cfg,
    };
    setAlertConfig(merged);
    requestAnimationFrame(() => {
      alertRef.current?.open();
      if (merged.autoClose && merged.autoClose > 0) {
        setTimeout(() => alertRef.current?.close(), merged.autoClose);
      }
    });
  };

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) {
          showAlert({
            title: 'Authentication Required',
            message: 'Please log in to access this feature',
            autoClose: 2200
          });
          return;
        }

        const response = await fetch(`${Config.API_BASE_URL}/predictive/dropdown-data`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.data) {
          setCropTypes(data.data.crops.map((item: any) => ({ label: item.name, value: item.name })));
          setSoilQualities(data.data.soilTypes.map((item: string) => ({ label: item, value: item })));
          setAnimalTypes(data.data.livestock.map((item: any) => ({ label: item.name, value: item.name })));
          setManagementSystems(data.data.managementSystems.map((item: string) => ({ label: item, value: item })));
          setPoultryTypes(data.data.poultry.map((item: any) => ({ label: item.name, value: item.name })));
          setHousingTypes(data.data.housingTypes.map((item: string) => ({ label: item, value: item })));
          setLocations(data.data.locations.map((item: string) => ({ label: item, value: item })));
        } else {
          throw new Error("Unexpected data structure in response");
        }
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
        showAlert({
          title: 'Error Loading Options',
            message: 'Failed to load dropdown options. Please check your connection and try again.',
            showCancel: true,
            confirmText: 'Retry',
            onConfirm: () => {
              alertRef.current?.close();
              fetchDropdownData();
            }
        });
      } finally {
        setDropdownLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  const fetchSavedSchedules = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("Please log in to access this feature");

      const response = await fetch(`${Config.API_BASE_URL}/predictive/saved-schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const formattedSchedules: SavedSchedule[] = [
          ...data.data.crops.map((item: any) => ({
            _id: item._id,
            type: 'crop',
            name: item.crop_type || item.name,
            location: item.location,
            startDate: item.start_date,
            createdAt: item.createdAt,
            soilQuality: item.soil_quality
          })),
          ...data.data.livestock.map((item: any) => ({
            _id: item._id,
            type: 'livestock',
            name: item.animal_type || item.name,
            location: item.location,
            startDate: item.start_date,
            createdAt: item.createdAt,
            managementSystem: item.management_system
          })),
          ...data.data.poultry.map((item: any) => ({
            _id: item._id,
            type: 'poultry',
            name: item.poultry_type || item.name,
            location: item.location,
            startDate: item.start_date,
            createdAt: item.createdAt,
            housingType: item.housing_type
          }))
        ];
        setSavedSchedules(formattedSchedules);
      }
    } catch (error) {
      console.error("Error fetching saved schedules:", error);
      showAlert({
        title: 'Error',
        message: 'Failed to load saved schedules',
        autoClose: 2000
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedSchedule = async (scheduleId: string) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) {
        throw new Error("Please log in to access this feature");
      }

      const scheduleToDelete = savedSchedules.find(s => s._id === scheduleId);
      if (!scheduleToDelete) {
        throw new Error("Schedule not found in local data");
      }

      let endpoint;
      switch (scheduleToDelete.type) {
        case 'crop':
          endpoint = 'crop-schedules';
          break;
        case 'livestock':
          endpoint = 'livestock-schedules';
          break;
        case 'poultry':
          endpoint = 'poultry-schedules';
          break;
        default:
          throw new Error("Invalid schedule type");
      }

      const response = await fetch(
        `${Config.API_BASE_URL}/predictive/saved-schedules/${scheduleId}`,
        {
          method: 'DELETE',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 404) {
        throw new Error("Schedule not found on server");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Delete failed with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Delete operation failed");
      }

      setSavedSchedules(prev => prev.filter(schedule => schedule._id !== scheduleId));
      showAlert({
        title: 'Success',
        message: 'Schedule deleted successfully',
        autoClose: 1800
      });
      
    } catch (error) {
      console.error("Delete error:", error);
      showAlert({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete schedule',
        autoClose: 2500
      });
    }
  };

  const confirmDelete = (scheduleId: string) => {
    showAlert({
      title: 'Confirm Delete',
      message: 'Are you sure you want to permanently delete this schedule?',
      showCancel: true,
      confirmText: 'Delete',
      onConfirm: () => {
        alertRef.current?.close();
        deleteSavedSchedule(scheduleId);
      }
    });
  };

  const parseScheduleData = (scheduleData: any): ScheduleItem[] => {
    if (!scheduleData) return [];
    
    if (Array.isArray(scheduleData)) {
      return scheduleData.filter(item => item.date && item.activity);
    }
    
    if (typeof scheduleData === "string") {
      try {
        const parsed = JSON.parse(scheduleData);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => item.date && item.activity);
        }
        if (parsed.date && parsed.activity) {
          return [parsed];
        }
      } catch {
        try {
          const cleaned = scheduleData
            .replace(/'/g, '"')
            .replace(/(\w+):/g, '"$1":')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          const cleanedParsed = JSON.parse(cleaned);
          if (Array.isArray(cleanedParsed)) {
            return cleanedParsed.filter(item => item.date && item.activity);
          }
          if (cleanedParsed.date && cleanedParsed.activity) {
            return [cleanedParsed];
          }
        } catch (e) {
          console.error("Failed to parse schedule data:", e);
        }
      }
    }
    
    if (scheduleData.date && scheduleData.activity) {
      return [scheduleData];
    }
    
    return [];
  };

  const fetchCropSchedule = async () => {
    if (!cropType?.trim() || !locationCrop?.trim() || !soilQuality?.trim()) {
      showAlert({
        title: 'Missing Fields',
        message: 'Please fill in all fields for crop schedule.',
      });
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) return;

      // Clear existing schedules first
      setMarkedDates({});
      setActivitiesByDate({});

      const params = {
        crop_type: cropType,
        location: locationCrop,
        soil_quality: soilQuality,
        start_date: startDate.toISOString().split('T')[0]
      };

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${Config.API_BASE_URL}/predictive/crop-schedule?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch crop schedule");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Invalid response from server");
      }

      const newMarkedDates: Record<string, MarkedDate> = {};
      const newActivities: Record<string, any> = {};

      data.data.schedule.forEach((item: ScheduleItem) => {
        if (item.date && item.activity) {
          newMarkedDates[item.date] = {
            marked: true,
            dotColor: "#4CAF50",
            selected: true,
            selectedColor: "#c8f7c5",
          };
          
          // Store full activity details
          newActivities[item.date] = {
            activity: item.activity,
            weatherAlerts: item.weatherAlerts,
            notes: item.notes,
            priority: item.priority,
            idealConditions: item.idealConditions,
            bestPractices: item.best_practices,
            healthTips: item.health_tips
          };

          // For calendar display
          let activitySummary = item.activity;
          if (item.weatherAlerts?.length) {
            const highestAlert = item.weatherAlerts.reduce((prev, current) => 
              prev.level === 'Warning' ? prev : current
            );
            activitySummary += `\n${highestAlert.icon} ${highestAlert.level}`;
          }
          newActivities[item.date].summary = activitySummary;
        }
      });

      setMarkedDates(newMarkedDates);
      setActivitiesByDate(newActivities);
      setShowSavedSchedules(false);

      showAlert({
        title: 'Schedule Generated',
        message: `Successfully created ${cropType} schedule`,
        autoClose: 1800
      });

    } catch (error) {
      console.error("Error fetching crop schedule:", error);
      showAlert({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to load crop schedule'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLivestockSchedule = async () => {
    if (!animalType || !locationLivestock || !managementSystem) {
      showAlert({
        title: 'Missing Fields',
        message: 'Please fill in all fields for livestock schedule.'
      });
      return;
    }
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("Please log in to access this feature");

      setMarkedDates({});
      setActivitiesByDate({});

      const params = {
        animal_type: animalType,
        location: locationLivestock,
        management_system: managementSystem,
        start_date: startDate.toISOString().split('T')[0]
      };

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${Config.API_BASE_URL}/predictive/livestock-schedule?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch livestock schedule");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Invalid response from server");
      }

      const parsedSchedule = parseScheduleData(data.data.schedule);

      const newMarkedDates: Record<string, MarkedDate> = {};
      const newActivities: Record<string, any> = {};

      parsedSchedule.forEach((item: ScheduleItem) => {
        if (item.date && item.activity) {
          newMarkedDates[item.date] = {
            marked: true,
            dotColor: "#2196F3",
            selected: true,
            selectedColor: "#bbdefb",
          };
          
          newActivities[item.date] = {
            activity: item.activity,
            weatherAlerts: item.weatherAlerts,
            notes: item.notes,
            priority: item.priority,
            idealConditions: item.idealConditions,
            bestPractices: item.best_practices,
            healthTips: item.health_tips
          };

          let activitySummary = item.activity;
          if (item.weatherAlerts?.length) {
            const highestAlert = item.weatherAlerts.reduce((prev, current) => 
              prev.level === 'Warning' ? prev : current
            );
            activitySummary += `\n${highestAlert.icon} ${highestAlert.level}`;
          }
          newActivities[item.date].summary = activitySummary;
        }
      });

      setMarkedDates(newMarkedDates);
      setActivitiesByDate(newActivities);
      setShowSavedSchedules(false);

      showAlert({
        title: 'Schedule Generated',
        message: `Successfully created ${animalType} schedule`,
        autoClose: 1800
      });

    } catch (error) {
      console.error("Error fetching livestock schedule:", error);
      showAlert({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to load livestock schedule'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPoultrySchedule = async () => {
    if (!poultryType || !locationPoultry || !housingType) {
      showAlert({
        title: 'Missing Fields',
        message: 'Please fill in all fields for poultry schedule.'
      });
      return;
    }
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("Please log in to access this feature");

       setMarkedDates({});
       setActivitiesByDate({});

      const params = {
        poultry_type: poultryType,
        location: locationPoultry,
        housing_type: housingType,
        start_date: startDate.toISOString().split('T')[0]
      };

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${Config.API_BASE_URL}/predictive/poultry-schedule?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch poultry schedule");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Invalid response from server");
      }

      const parsedSchedule = parseScheduleData(data.data.schedule);

      const newMarkedDates: Record<string, MarkedDate> = {};
      const newActivities: Record<string, any> = {};

      parsedSchedule.forEach((item: ScheduleItem) => {
        if (item.date && item.activity) {
          newMarkedDates[item.date] = {
            marked: true,
            dotColor: "#FF9800",
            selected: true,
            selectedColor: "#ffe0b2",
          };
          
          newActivities[item.date] = {
            activity: item.activity,
            weatherAlerts: item.weatherAlerts,
            notes: item.notes,
            priority: item.priority,
            idealConditions: item.idealConditions,
            bestPractices: item.best_practices,
            healthTips: item.health_tips
          };

          let activitySummary = item.activity;
          if (item.weatherAlerts?.length) {
            const highestAlert = item.weatherAlerts.reduce((prev, current) => 
              prev.level === 'Warning' ? prev : current
            );
            activitySummary += `\n${highestAlert.icon} ${highestAlert.level}`;
          }
          newActivities[item.date].summary = activitySummary;
        }
      });

      setMarkedDates(newMarkedDates);
      setActivitiesByDate(newActivities);
      setShowSavedSchedules(false);

      showAlert({
        title: 'Schedule Generated',
        message: `Successfully created ${poultryType} schedule`,
        autoClose: 1800
      });

    } catch (error) {
      console.error("Error fetching poultry schedule:", error);
      showAlert({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to load poultry schedule'
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmScheduleRefresh = async () => {
    showAlert({
      title: 'Generate New Schedule',
      message: 'This will delete any existing schedule for this crop. Continue?',
      showCancel: true,
      confirmText: 'Continue',
      onConfirm: () => {
        alertRef.current?.close();
        fetchCropSchedule();
      }
    });
  };

  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    const activityData = activitiesByDate[day.dateString];
    if (activityData) {
      let alertMessage = `📅 ${day.dateString}\n\n🌱 ACTIVITY: ${activityData.activity}\n\n`;
      
      // Add priority if available
      if (activityData.priority) {
        alertMessage += `⚠️ PRIORITY: ${activityData.priority.toUpperCase()}\n\n`;
      }

      // Add ideal conditions if available
      if (activityData.idealConditions) {
        alertMessage += "🌤️ IDEAL CONDITIONS:\n";
        alertMessage += `${activityData.idealConditions}\n\n`;
      }

      // Add best practices if available
      if (activityData.bestPractices) {
        alertMessage += "📝 BEST PRACTICES:\n";
        alertMessage += `${activityData.bestPractices}\n\n`;
      }

      // Add health tips if available
      if (activityData.healthTips) {
        alertMessage += "💊 HEALTH TIPS:\n";
        alertMessage += `${activityData.healthTips}\n\n`;
      }

      // Add notes if available
      if (activityData.notes?.length) {
        alertMessage += "📌 NOTES:\n";
        activityData.notes.forEach((note: string) => {
          alertMessage += `\n• ${note}`;
        });
        alertMessage += "\n\n";
      }

      // Add weather alerts if available
      if (activityData.weatherAlerts?.length) {
        activityData.weatherAlerts.forEach((alert: WeatherAlert) => {
          alertMessage += `\n${alert.icon} ${alert.level} (${alert.parameter.toUpperCase()})`;
          alertMessage += `\n${alert.description}`;
          alertMessage += `\nImpact: ${alert.message}`;
          alertMessage += `\nAction: ${alert.action}\n`;
        });
      }

      showAlert({
        title: 'Scheduled Activity Details',
        message: alertMessage,
        showCancel: true,
        confirmText: 'Full Schedule',
        onConfirm: () => {
          alertRef.current?.close();
          setShowSavedSchedules(true);
        }
      });
    }
  };

  const loadSavedSchedule = async (schedule: SavedSchedule) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("Please log in to access this feature");

      let endpoint = "";
      let params = {};
      
      // Set endpoint and params based on schedule type
      switch (schedule.type) {
        case "crop":
          endpoint = "crop-schedule";
          params = {
            crop_type: schedule.name,
            location: schedule.location,
            soil_quality: schedule.soilQuality,
            start_date: schedule.startDate,
            scheduleId: schedule._id
          };
          break;
        case "livestock":
          endpoint = "livestock-schedule";
          params = {
            animal_type: schedule.name,
            location: schedule.location,
            management_system: schedule.managementSystem,
            start_date: schedule.startDate,
            scheduleId: schedule._id
          };
          break;
        case "poultry":
          endpoint = "poultry-schedule";
          params = {
            poultry_type: schedule.name,
            location: schedule.location,
            housing_type: schedule.housingType,
            start_date: schedule.startDate,
            scheduleId: schedule._id
          };
          break;
        default:
          throw new Error("Invalid schedule type");
      }

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${Config.API_BASE_URL}/predictive/${endpoint}?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to load saved schedule");
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to load saved schedule");

      const parsedSchedule = parseScheduleData(data.data.schedule);

      const newMarkedDates: Record<string, MarkedDate> = {};
      const newActivities: Record<string, any> = {};

      parsedSchedule.forEach((item: ScheduleItem) => {
        if (item.date && item.activity) {
          const dotColor = schedule.type === "crop" ? "#4CAF50" : 
                        schedule.type === "livestock" ? "#2196F3" : "#FF9800";
          const selectedColor = schedule.type === "crop" ? "#c8f7c5" : 
                              schedule.type === "livestock" ? "#bbdefb" : "#ffe0b2";

          newMarkedDates[item.date] = {
            marked: true,
            dotColor,
            selected: true,
            selectedColor,
          };
          
          newActivities[item.date] = {
            activity: item.activity,
            weatherAlerts: item.weatherAlerts,
            notes: item.notes,
            priority: item.priority,
            idealConditions: item.idealConditions,
            bestPractices: item.best_practices,
            healthTips: item.health_tips
          };

          let activitySummary = item.activity;
          if (item.weatherAlerts?.length) {
            const highestAlert = item.weatherAlerts.reduce((prev, current) => 
              prev.level === 'Warning' ? prev : current
            );
            activitySummary += `\n${highestAlert.icon} ${highestAlert.level}`;
          }
          newActivities[item.date].summary = activitySummary;
        }
      });

      setMarkedDates(newMarkedDates);
      setActivitiesByDate(newActivities);
      setShowSavedSchedules(false);

      showAlert({
        title: 'Schedule Loaded',
        message: `Successfully loaded ${schedule.name} schedule starting ${new Date(schedule.startDate).toLocaleDateString()}`,
        autoClose: 2000
      });

    } catch (error) {
      console.error(error);
      showAlert({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to load saved schedule',
        showCancel: true,
        confirmText: 'Retry',
        onConfirm: () => {
          alertRef.current?.close();
          loadSavedSchedule(schedule);
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: Date) => {
    setStartDate(date);
    setShowDatePicker(false);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const ModernDropdown = (
    value: string,
    setValue: (value: string) => void,
    data: DropdownData[],
    placeholder: string,
    iconName: string
  ) => (
    <View style={styles.dropdownContainer}>
      <Icon name={iconName} size={20} color="#555" style={styles.dropdownIcon} />
      <Dropdown
        style={styles.dropdown}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        inputSearchStyle={styles.inputSearchStyle}
        iconStyle={styles.iconStyle}
        data={data}
        search
        maxHeight={300}
        labelField="label"
        valueField="value"
        placeholder={dropdownLoading ? "Loading options..." : placeholder}
        searchPlaceholder="Search..."
        value={value}
        onChange={(item) => setValue(item.value)}
        renderRightIcon={() => (
          <Icon 
            name="arrow-drop-down" 
            size={24} 
            color="#555" 
            style={styles.dropdownArrow}
          />
        )}
      />
    </View>
  );

  const ModernScheduleItem = ({ item }: { item: SavedSchedule }) => (
    <View style={styles.scheduleCard}>
      <View style={[
        styles.scheduleTypeIndicator,
        item.type === 'crop' && styles.cropIndicator,
        item.type === 'livestock' && styles.livestockIndicator,
        item.type === 'poultry' && styles.poultryIndicator,
      ]} />
      
      <View style={styles.scheduleContent}>
        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleTitle}>{item.name}</Text>
          <View style={styles.scheduleTypeBadge}>
            <Text style={styles.scheduleTypeText}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.scheduleDetails}>
          <View style={styles.detailItem}>
            <Icon name="location-on" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Icon name="calendar-today" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              {new Date(item.startDate).toLocaleDateString()}
            </Text>
          </View>
          
          {item.type === 'crop' && item.soilQuality && (
            <View style={styles.detailItem}>
              <Icon name="grass" size={16} color="#6B7280" />
              <Text style={styles.detailText}>Soil: {item.soilQuality}</Text>
            </View>
          )}
          
          {item.type === 'livestock' && item.managementSystem && (
            <View style={styles.detailItem}>
              <Icon name="agriculture" size={16} color="#6B7280" />
              <Text style={styles.detailText}>System: {item.managementSystem}</Text>
            </View>
          )}
          
          {item.type === 'poultry' && item.housingType && (
            <View style={styles.detailItem}>
              <Icon name="home-work" size={16} color="#6B7280" />
              <Text style={styles.detailText}>Housing: {item.housingType}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.scheduleActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => loadSavedSchedule(item)}
          >
            <Icon name="visibility" size={18} color="#3B82F6" />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => confirmDelete(item._id)}
          >
            <Icon name="delete-outline" size={18} color="#EF4444" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderDatePicker = () => (
    <View style={styles.datePickerContainer}>
      <Text style={styles.datePickerLabel}>Start Date</Text>
      <TouchableOpacity 
        onPress={showDatepicker} 
        style={styles.datePickerButton}
      >
        <Icon name="event" size={20} color="#4B5563" />
        <Text style={styles.datePickerText}>
          {startDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </Text>
        <Icon name="keyboard-arrow-down" size={20} color="#4B5563" />
      </TouchableOpacity>
      <DatePicker
        modal
        open={showDatePicker}
        date={startDate}
        mode="date"
        onConfirm={handleDateChange}
        onCancel={() => setShowDatePicker(false)}
      />
    </View>
  );

  const renderFormSelector = () => (
    <View style={styles.selectorContainer}>
      <TouchableOpacity
        style={[
          styles.selectorButton,
          selectedForm === "crop" && styles.selectorButtonActive
        ]}
        onPress={() => setSelectedForm("crop")}
      >
        <Icon 
          name="grass" 
          size={20} 
          color={selectedForm === "crop" ? "#000" : "#10B981"} 
        />
        <Text style={[
          styles.selectorText,
          selectedForm === "crop" && styles.selectorTextActive
        ]}>
          Crop
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.selectorButton,
          selectedForm === "livestock" && styles.selectorButtonActive
        ]}
        onPress={() => setSelectedForm("livestock")}
      >
        <Icon 
          name="pets" 
          size={20} 
          color={selectedForm === "livestock" ? "#000" : "#3B82F6"} 
        />
        <Text style={[
          styles.selectorText,
          selectedForm === "livestock" && styles.selectorTextActive
        ]}>
          Livestock
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.selectorButton,
          selectedForm === "poultry" && styles.selectorButtonActive
        ]}
        onPress={() => setSelectedForm("poultry")}
      >
        <Icon 
          name="egg" 
          size={20} 
          color={selectedForm === "poultry" ? "#000" : "#F59E0B"} 
        />
        <Text style={[
          styles.selectorText,
          selectedForm === "poultry" && styles.selectorTextActive
        ]}>
          Poultry
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderActivityCard = () => {
    const activityData = activitiesByDate[selectedDate];
    if (!activityData) return null;

    // Normalize priority label for badge colors (treat "normal" as "low")
    const priority = (activityData.priority || '').toLowerCase();
    const normalizedPriority = priority === 'normal' ? 'low' : priority;

    return (
      <View style={styles.activityCard}>
        <View style={styles.activityCardHeader}>
          <Text style={styles.activityDate}>
            {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
          {normalizedPriority && (
            <View style={[
              styles.priorityBadge,
              normalizedPriority === 'high' && styles.highPriority,
              normalizedPriority === 'medium' && styles.mediumPriority,
              normalizedPriority === 'low' && styles.lowPriority,
            ]}>
              <Text style={styles.priorityText}>{normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1)} Priority</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.activityTitle}>{activityData.activity}</Text>
        
        {activityData.idealConditions && (
          <View style={styles.infoSection}>
            <View style={styles.sectionHeader}>
              <Icon name="wb-sunny" size={18} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Ideal Conditions</Text>
            </View>
            <Text style={styles.sectionContent}>{activityData.idealConditions}</Text>
          </View>
        )}
        
        {activityData.bestPractices && (
          <View style={styles.infoSection}>
            <View style={styles.sectionHeader}>
              <Icon name="lightbulb-outline" size={18} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Best Practices</Text>
            </View>
            <Text style={styles.sectionContent}>{activityData.bestPractices}</Text>
          </View>
        )}
        
        {activityData.healthTips && (
          <View style={styles.infoSection}>
            <View style={styles.sectionHeader}>
              <Icon name="medical-services" size={18} color="#EF4444" />
              <Text style={styles.sectionTitle}>Health Tips</Text>
            </View>
            <Text style={styles.sectionContent}>{activityData.healthTips}</Text>
          </View>
        )}
        
        {activityData.weatherAlerts?.length ? (
          <View style={styles.weatherAlerts}>
            <View style={styles.sectionHeader}>
              <Icon name="warning" size={18} color="#EF4444" />
              <Text style={styles.sectionTitle}>Weather Alerts</Text>
            </View>
            {activityData.weatherAlerts?.map((alert: WeatherAlert, index: number) => (
              <View key={index} style={styles.alertItem}>
                <View style={[
                  styles.alertLevel,
                  alert.level === 'Warning' && styles.warningLevel,
                  alert.level === 'Caution' && styles.cautionLevel,
                  alert.level === 'Info' && styles.infoLevel,
                ]}>
                  <Text style={styles.alertLevelText}>{alert.level}</Text>
                </View>
                <Text style={styles.alertText}>
                  {alert.description} ({alert.parameter})
                </Text>
                <Text style={styles.alertAction}>
                  <Text style={{ fontWeight: 'bold' }}>Action:</Text> {alert.action}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Smart Farming Calendar</Text>
        <Text style={styles.headerSubtitle}>
          Plan and optimize your agricultural activities
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Toggle between forms and saved schedules */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              !showSavedSchedules && styles.activeToggleButton
            ]}
            onPress={() => setShowSavedSchedules(false)}
          >
            <Text style={[
              styles.toggleButtonText,
              !showSavedSchedules && styles.activeToggleButtonText
            ]}>
              New Schedule
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              showSavedSchedules && styles.activeToggleButton
            ]}
            onPress={() => {
              setShowSavedSchedules(true);
              fetchSavedSchedules();
            }}
          >
            <Text style={[
              styles.toggleButtonText,
              showSavedSchedules && styles.activeToggleButtonText
            ]}>
              Saved Schedules
            </Text>
          </TouchableOpacity>
        </View>

        {showSavedSchedules ? (
          <View style={styles.savedSchedulesContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>Loading your schedules...</Text>
              </View>
            ) : savedSchedules.length > 0 ? (
              <FlatList
                data={savedSchedules}
                renderItem={ModernScheduleItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.scheduleList}
                style={{ flex: 1 }}
                ListHeaderComponent={
                  <Text style={styles.savedSchedulesTitle}>Your Saved Schedules</Text>
                }
                ListFooterComponent={<View style={{ height: 20 }} />}
                refreshing={loading}
                onRefresh={fetchSavedSchedules}
              />
            ) : (
              <View style={styles.emptyState}>
                <Icon name="event-note" size={50} color="#D1D5DB" />
                <Text style={styles.emptyStateTitle}>No saved schedules</Text>
                <Text style={styles.emptyStateText}>
                  Create a new farming schedule to see it here
                </Text>
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={() => setShowSavedSchedules(false)}
                >
                  <Text style={styles.emptyStateButtonText}>Create New Schedule</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Form Selector */}
            {renderFormSelector()}

            {/* Start Date Picker */}
            {renderDatePicker()}

            {/* Dynamic Form Section */}
            <View style={styles.formCard}>
              {selectedForm === "crop" && (
                <>
                  {ModernDropdown(cropType, setCropType, cropTypes, "Select Crop Type", "grass")}
                  {ModernDropdown(locationCrop, setLocationCrop, locations, "Select Location", "location-on")}
                  {ModernDropdown(soilQuality, setSoilQuality, soilQualities, "Select Soil Quality", "terrain")}

                  {/* Submit */}
                  <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={confirmScheduleRefresh}
                    activeOpacity={0.8}
                  >
                    <View style={styles.buttonContent}>
                      <Text style={styles.submitButtonText}>Generate Crop Schedule</Text>
                      <Icon name="play-arrow" size={20} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {selectedForm === "livestock" && (
                <>
                  {ModernDropdown(animalType, setAnimalType, animalTypes, "Select Animal Type", "pets")}
                  {ModernDropdown(locationLivestock, setLocationLivestock, locations, "Select Location", "location-on")}
                  {ModernDropdown(managementSystem, setManagementSystem, managementSystems, "Select Management System", "agriculture")}

                  {/* Submit */}
                  <TouchableOpacity 
                    style={[styles.submitButton, styles.livestockButton]}
                    onPress={fetchLivestockSchedule}
                    activeOpacity={0.8}
                  >
                    <View style={styles.buttonContent}>
                      <Text style={styles.submitButtonText}>Generate Livestock Schedule</Text>
                      <Icon name="play-arrow" size={20} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {selectedForm === "poultry" && (
                <>
                  {ModernDropdown(poultryType, setPoultryType, poultryTypes, "Select Poultry Type", "egg")}
                  {ModernDropdown(locationPoultry, setLocationPoultry, locations, "Select Location", "location-on")}
                  {ModernDropdown(housingType, setHousingType, housingTypes, "Select Housing Type", "home-work")}

                  {/* Submit */}
                  <TouchableOpacity 
                    style={[styles.submitButton, styles.poultryButton]}
                    onPress={fetchPoultrySchedule}
                    activeOpacity={0.8}
                  >
                    <View style={styles.buttonContent}>
                      <Text style={styles.submitButtonText}>Generate Poultry Schedule</Text>
                      <Icon name="play-arrow" size={20} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>Generating your schedule...</Text>
              </View>
            )}

            {/* Calendar Section */}
            {Object.keys(markedDates).length > 0 && (
              <View style={styles.calendarSection}>
                <Text style={styles.sectionTitle}>Your Farming Calendar</Text>
                <View style={styles.calendarContainer}>
                  <Calendar
                    current={selectedDate}
                    markingType="multi-dot"
                    markedDates={markedDates}
                    onDayPress={handleDayPress}
                    theme={{
                      calendarBackground: '#fff',
                      textSectionTitleColor: '#6B7280',
                      selectedDayBackgroundColor: '#10B981',
                      selectedDayTextColor: '#fff',
                      todayTextColor: '#10B981',
                      dayTextColor: '#111827',
                      textDisabledColor: '#D1D5DB',
                      dotColor: '#10B981',
                      selectedDotColor: '#fff',
                      arrowColor: '#10B981',
                      monthTextColor: '#111827',
                      indicatorColor: '#10B981',
                      textDayFontWeight: '500',
                      textMonthFontWeight: 'bold',
                      textDayHeaderFontWeight: '500',
                      textDayFontSize: 14,
                      textMonthFontSize: 16,
                      textDayHeaderFontSize: 14,
                    }}
                    style={styles.calendar}
                    dayComponent={({ date, state, marking }) => {
                      const key = date?.dateString;
                      const isSelected = key === selectedDate;
                      const activity = activitiesByDate[key || ''];
                      // Compute a severity dot color: severe->red, moderate->amber, else->green
                      const highest = Array.isArray(activity?.weatherAlerts) && activity.weatherAlerts.length
                        ? activity.weatherAlerts.reduce((prev: any, curr: any) => {
                            const rank = (lvl: string) => {
                              const l = (lvl || '').toLowerCase();
                              if (l.includes('warning') || l.includes('severe')) return 3;
                              if (l.includes('caution') || l.includes('moderate')) return 2;
                              return 1;
                            };
                            return rank(curr.level) > rank(prev.level) ? curr : prev;
                          })
                        : null;
                      const dotClr = highest
                        ? ((lvl => {
                            const l = (lvl || '').toLowerCase();
                            if (l.includes('warning') || l.includes('severe')) return '#EF4444';
                            if (l.includes('caution') || l.includes('moderate')) return '#F59E0B';
                            return '#10B981';
                          })(highest.level))
                        : (marking?.dotColor || '#10B981');

                      return (
                        <TouchableOpacity
                          onPress={() => handleDayPress({ dateString: key! })}
                          style={[
                            styles.dayContainer,
                            isSelected && styles.currentSelectedDay
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              state === 'disabled' && styles.disabledText,
                              key === new Date().toISOString().split('T')[0] && styles.todayText,
                              isSelected && styles.currentSelectedDayText,
                            ]}
                          >
                            {date?.day}
                          </Text>
                          {activity && (
                            <View
                              style={[
                                styles.alertDot,
                                { backgroundColor: dotClr },
                                (highest && (highest.level || '').toLowerCase().includes('warning')) && styles.warningDot
                              ]}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />

                  {/* Activity Details for Selected Date */}
                  {renderActivityCard()}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Place AlertPro at root */}
      <AlertPro
        ref={alertRef}
        onConfirm={() => {
          alertConfig.onConfirm?.();
        }}
        onCancel={() => {
          alertRef.current?.close();
          alertConfig.onCancel?.();
        }}
        title={alertConfig.title}
        message={alertConfig.message}
        showCancel={alertConfig.showCancel}
        textConfirm={alertConfig.confirmText}
        textCancel={alertConfig.cancelText}
        customStyles={{
          mask: { backgroundColor: 'rgba(0,0,0,0.35)' },
          container: { borderRadius: 16 }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 32,
    backgroundColor: '#f0fdf4',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#064E3B',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#047857',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: -16,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#10B981',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeToggleButtonText: {
    color: '#fff',
  },
  savedSchedulesContainer: {
    flex: 1,
  },
  scheduleList: {
    paddingBottom: 20,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  scheduleTypeIndicator: {
    width: 6,
    backgroundColor: '#10B981',
  },
  cropIndicator: {
    backgroundColor: '#10B981',
  },
  livestockIndicator: {
    backgroundColor: '#3B82F6',
  },
  poultryIndicator: {
    backgroundColor: '#F59E0B',
  },
  scheduleContent: {
    flex: 1,
    padding: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  scheduleTypeBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduleTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  scheduleDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  scheduleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  savedSchedulesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    marginTop: 8,
  },
  selectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  selectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectorButtonActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  selectorTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginHorizontal: 12,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  dropdown: {
    flex: 1,
    height: 48,
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#111827',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  dropdownArrow: {
    marginLeft: 8,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#10B981',
  },
  livestockButton: {
    backgroundColor: '#3B82F6',
  },
  poultryButton: {
    backgroundColor: '#F59E0B',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scrollContainer: {
    flex: 1,
  },
  calendarSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calendar: {
    borderRadius: 8,
  },
  dayContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  disabledText: {
    color: '#D1D5DB',
  },
  todayText: {
    color: '#10B981',
    fontWeight: '600',
  },
  selectedDay: {
    backgroundColor: '#D1FAE5',
  },
  currentSelectedDay: {
    backgroundColor: '#10B981',
  },
  currentSelectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  alertDay: {
    color: '#EF4444',
  },
  alertDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  warningDot: {
    backgroundColor: '#EF4444',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  highPriority: {
    backgroundColor: '#FEE2E2',
  },
  mediumPriority: {
    backgroundColor: '#FEF3C7',
  },
  lowPriority: {
    backgroundColor: '#D1FAE5',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  weatherAlerts: {
    marginTop: 16,
  },
  alertItem: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  alertLevel: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
    backgroundColor: '#F59E0B',
  },
  warningLevel: {
    backgroundColor: '#EF4444',
  },
  cautionLevel: {
    backgroundColor: '#F59E0B',
  },
  infoLevel: {
    backgroundColor: '#3B82F6',
  },
  alertLevelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  alertText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  alertAction: {
    fontSize: 14,
    color: '#4B5563',
    fontStyle: 'italic',
  },
   todayDay: {
    backgroundColor: '#4CAF50',
  },
});

export default SmartCropCalendarScreen;