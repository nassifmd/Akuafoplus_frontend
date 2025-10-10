import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Modal,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Config from "../../Config/config";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "react-native-vector-icons/Ionicons";

const API_URL = `${Config.API_BASE_URL}/livestock`;

type HealthRecord = {
  issue: string;
  treatment: string;
  date: string | Date;
  cost: number;
  medication?: string;
  dosage?: string;
  notes?: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  followUpRequired?: boolean;
  followUpDate?: string | Date;
};

type BreedingRecord = {
  _id?: string;
  date: string | Date;
  breedingMethod: string;
  sireId?: string;
  sireBreed?: string;
  pregnancyConfirmed?: boolean;
  expectedDeliveryDate?: string | Date;
  actualDeliveryDate?: string | Date;
  offspringCount?: number;
  notes?: string;
};

type WeightRecord = {
  _id?: string;
  date: string | Date;
  weight: number;
  notes?: string;
  method: string;
};

type FatteningRecord = {
  _id: string;
  isActive: boolean;
  startDate?: string | Date;
  initialWeight?: number;
  targetWeight?: number;
  dailyWeightGainTarget?: number;
  dailyConcentrateFeed?: {
    amount?: number;
    composition?: string;
    costPerKg?: number;
  };
  dailyForageFeed?: {
    amount?: number;
    type?: string;
    costPerKg?: number;
  };
  waterRequirement?: number;
  durationDays?: number;
  notes?: string;
  actualDailyGain?: { date: string | Date; weight: number; notes?: string }[];
  feedAdjustments?: {
    date: string | Date;
    concentrateChange: number;
    forageChange: number;
    reason: string;
    costImpact?: number;
  }[];
};

type Animal = {
  _id: string;
  tagId: string;
  name?: string;
  breed: string;
  sex: string;
  dob: string | Date;
  colorMarkings?: string;
  status: string;
  species?: string;
  healthRecords?: HealthRecord[];
  breedingRecords?: BreedingRecord[];
  weightRecords?: WeightRecord[];
  fatteningRecords?: FatteningRecord[];
};

const LivestockTab = ({ navigation }: any) => {
  const [accessToken, setAccessToken] = useState("");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [recordType, setRecordType] = useState("");
  const [breedRecommendation, setBreedRecommendation] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [expandedSections, setExpandedSections] = useState({
    health: false,
    breeding: false,
    weight: false,
    fattening: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // Form states
  const [animalForm, setAnimalForm] = useState({
    tagId: "",
    name: "",
    breed: "White Fulani",
    sex: "Male",
    dob: new Date(),
    colorMarkings: "",
    status: "Active",
    species: "Cattle",
    initialWeight: "",
    initialHealthNotes: "",
  });

  const [healthRecordForm, setHealthRecordForm] = useState({
    issue: "",
    treatment: "",
    date: new Date(),
    cost: "",
    medication: "",
    dosage: "",
    notes: "",
    severity: "Medium",
    followUpRequired: false,
  });

  const [breedingRecordForm, setBreedingRecordForm] = useState({
    date: new Date(),
    breedingMethod: "Natural",
    sireId: "",
    sireBreed: "",
    pregnancyConfirmed: false,
    expectedDeliveryDate: new Date(),
    actualDeliveryDate: new Date(),
    offspringCount: "",
    notes: "",
  });

  const [weightRecordForm, setWeightRecordForm] = useState({
    date: new Date(),
    weight: "",
    notes: "",
    method: "Scale",
  });

  const [fatteningRecordForm, setFatteningRecordForm] = useState({
    startDate: new Date(),
    initialWeight: "",
    targetWeight: "",
    dailyWeightGainTarget: "",
    dailyConcentrateFeed: {
      amount: "",
      composition: "",
      costPerKg: "",
    },
    dailyForageFeed: {
      amount: "",
      type: "",
      costPerKg: "",
    },
    waterRequirement: "",
    durationDays: "",
    notes: "",
  });

  const [dailyWeightForm, setDailyWeightForm] = useState({
    date: new Date(),
    weight: "",
    notes: "",
  });

  const [feedAdjustmentForm, setFeedAdjustmentForm] = useState({
    date: new Date(),
    concentrateChange: "",
    forageChange: "",
    reason: "",
    costImpact: "",
  });

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState("");

  useEffect(() => {
    const getToken = async () => {
      const token = await AsyncStorage.getItem("accessToken");
      if (token) {
        setAccessToken(token);
        fetchAnimals(token);
      }
    };
    getToken();
  }, []);

  const fetchAnimals = async (token: string) => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAnimals(response.data.data);
    } catch (error) {
      console.error("Error fetching animals:", error);
      setError("Failed to fetch animals");
    } finally {
      setLoading(false);
    }
  };

  // Filter animals based on search and status
  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = animal.tagId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         animal.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         animal.breed.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "All" || animal.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const createAnimal = async () => {
    if (!animalForm.tagId || !animalForm.breed || !animalForm.sex || !animalForm.dob) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const {
        tagId, name, breed, sex, dob, colorMarkings, species, initialWeight, initialHealthNotes
      } = animalForm;

      const payload: any = {
        tagId,
        name,
        breed,
        sex,
        dob: dob.toISOString(),
        colorMarkings,
        species,
      };

      if (initialWeight) payload.initialWeight = parseFloat(initialWeight as any);
      if (initialHealthNotes) payload.initialHealthNotes = initialHealthNotes;

      const response = await axios.post(API_URL, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      Alert.alert("Success", "Animal registered and placed in quarantine for 20 days");
      setModalVisible(false);
      fetchAnimals(accessToken);
    } catch (error: any) {
      console.error("Error creating animal:", error?.response?.data || error?.message);
      const serverMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to create animal";
      Alert.alert("Error", serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateAnimal = async () => {
    if (!selectedAnimal) return;

    // Backend-allowed fields: name, breed, status, colorMarkings, currentValue, insuranceInfo
    const allowedBreeds = ["White Fulani", "Sokoto Gudali", "Ndama", "Holstein", "Jersey"];
    if (!allowedBreeds.includes(animalForm.breed)) {
      Alert.alert("Error", "Selected breed is not supported by the system.");
      return;
    }

    const payload: any = {
      breed: animalForm.breed,
      status: animalForm.status,
    };
    if (animalForm.name?.trim()) payload.name = animalForm.name.trim();
    if (animalForm.colorMarkings?.trim()) payload.colorMarkings = animalForm.colorMarkings.trim();
    // Optionally include currentValue/insuranceInfo here if you add them to the form

    setLoading(true);
    try {
      await axios.put(
        `${API_URL}/${selectedAnimal._id}`,
        payload,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      Alert.alert("Success", "Animal updated successfully");
      setModalVisible(false);
      fetchAnimals(accessToken);
    } catch (error: any) {
      console.error("Error updating animal:", error?.response?.data || error?.message);
      const serverMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to update animal";
      Alert.alert("Error", serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const deleteAnimal = async () => {
    if (!selectedAnimal) return;

    Alert.alert(
      "Delete Animal",
      `Are you sure you want to delete ${selectedAnimal.tagId}${selectedAnimal.name ? ` (${selectedAnimal.name})` : ''}? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await axios.delete(`${API_URL}/${selectedAnimal._id}`, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });

              Alert.alert("Success", "Animal deleted successfully");
              
              // Close modal and reset states
              setModalVisible(false);
              setSelectedAnimal(null);
              setViewMode("list");
              
              // Refresh the animals list
              await fetchAnimals(accessToken);
            } catch (error: any) {
              console.error("Error deleting animal:", error);
              
              let errorMessage = "Failed to delete animal";
              
              if (error.response?.status === 403) {
                errorMessage = error.response?.data?.message || "You don't have permission to delete animals. Only farm owners and admins can delete animals.";
              } else if (error.response?.status === 404) {
                errorMessage = "Animal not found. It may have already been deleted.";
              } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error.message) {
                errorMessage = error.message;
              }
              
              Alert.alert("Error", errorMessage);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const addHealthRecord = async () => {
    if (!selectedAnimal) {
      Alert.alert("Error", "No animal selected");
      return;
    }
    if (!healthRecordForm.issue || !healthRecordForm.treatment) {
      Alert.alert("Error", "Issue and treatment are required");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/${selectedAnimal._id}/health`,
        {
          ...healthRecordForm,
          date: healthRecordForm.date.toISOString(),
          cost: healthRecordForm.cost ? parseFloat(healthRecordForm.cost) : 0,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      Alert.alert("Success", "Health record added successfully");
      setModalVisible(false);
      fetchAnimals(accessToken);
    } catch (error) {
      console.error("Error adding health record:", error);
      Alert.alert("Error", "Failed to add health record");
    } finally {
      setLoading(false);
    }
  };

  const addBreedingRecord = async () => {
    if (!selectedAnimal) {
      Alert.alert("Error", "No animal selected");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        ...breedingRecordForm,
        date: breedingRecordForm.date.toISOString(),
      };

      if (breedingRecordForm.pregnancyConfirmed) {
        payload.expectedDeliveryDate = breedingRecordForm.expectedDeliveryDate.toISOString();
      }

      if (breedingRecordForm.offspringCount) {
        payload.offspringCount = parseInt(breedingRecordForm.offspringCount);
        payload.actualDeliveryDate = breedingRecordForm.actualDeliveryDate.toISOString();
      }

      const response = await axios.post(
        `${API_URL}/${selectedAnimal._id}/breeding`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      Alert.alert("Success", "Breeding record added successfully");
      setModalVisible(false);
      fetchAnimals(accessToken);
    } catch (error) {
      console.error("Error adding breeding record:", error);
      Alert.alert("Error", "Failed to add breeding record");
    } finally {
      setLoading(false);
    }
  };

  const addWeightRecord = async () => {
    if (!selectedAnimal) {
      Alert.alert("Error", "No animal selected");
      return;
    }
    if (!weightRecordForm.weight) {
      Alert.alert("Error", "Weight is required");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/${selectedAnimal._id}/weight`,
        {
          ...weightRecordForm,
          date: weightRecordForm.date.toISOString(),
          weight: parseFloat(weightRecordForm.weight),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      Alert.alert("Success", "Weight record added successfully");
      setModalVisible(false);
      fetchAnimals(accessToken);
    } catch (error) {
      console.error("Error adding weight record:", error);
      Alert.alert("Error", "Failed to add weight record");
    } finally {
      setLoading(false);
    }
  };

  const addFatteningRecord = async () => {
    if (
      !fatteningRecordForm.initialWeight ||
      !fatteningRecordForm.targetWeight ||
      !fatteningRecordForm.dailyWeightGainTarget
    ) {
      Alert.alert("Error", "Required fields are missing");
      return;
    }

    if (!selectedAnimal) {
      Alert.alert("Error", "No animal selected");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/${selectedAnimal._id}/fattening`,
        {
          ...fatteningRecordForm,
          startDate: fatteningRecordForm.startDate.toISOString(),
          initialWeight: parseFloat(fatteningRecordForm.initialWeight),
          targetWeight: parseFloat(fatteningRecordForm.targetWeight),
          dailyWeightGainTarget: parseFloat(fatteningRecordForm.dailyWeightGainTarget),
          dailyConcentrateFeed: {
            amount: fatteningRecordForm.dailyConcentrateFeed.amount ? 
                   parseFloat(fatteningRecordForm.dailyConcentrateFeed.amount) : 0,
            composition: fatteningRecordForm.dailyConcentrateFeed.composition,
            costPerKg: fatteningRecordForm.dailyConcentrateFeed.costPerKg ? 
                      parseFloat(fatteningRecordForm.dailyConcentrateFeed.costPerKg) : 0,
          },
          dailyForageFeed: {
            amount: fatteningRecordForm.dailyForageFeed.amount ? 
                   parseFloat(fatteningRecordForm.dailyForageFeed.amount) : 0,
            type: fatteningRecordForm.dailyForageFeed.type,
            costPerKg: fatteningRecordForm.dailyForageFeed.costPerKg ? 
                      parseFloat(fatteningRecordForm.dailyForageFeed.costPerKg) : 0,
          },
          waterRequirement: fatteningRecordForm.waterRequirement ? 
                           parseFloat(fatteningRecordForm.waterRequirement) : 0,
          durationDays: fatteningRecordForm.durationDays ? 
                       parseInt(fatteningRecordForm.durationDays) : 0,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      Alert.alert("Success", "Fattening record added successfully");
      setModalVisible(false);
      fetchAnimals(accessToken);
    } catch (error) {
      console.error("Error adding fattening record:", error);
      Alert.alert("Error", "Failed to add fattening record");
    } finally {
      setLoading(false);
    }
  };

  const addDailyWeight = async (recordId: string) => {
    if (!dailyWeightForm.weight) {
      Alert.alert("Error", "Weight is required");
      return;
    }

    if (!selectedAnimal) {
      Alert.alert("Error", "No animal selected");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/${selectedAnimal._id}/fattening/${recordId}/weight`,
        {
          ...dailyWeightForm,
          date: dailyWeightForm.date.toISOString(),
          weight: parseFloat(dailyWeightForm.weight),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      Alert.alert("Success", "Daily weight added successfully");
      setModalVisible(false);
      fetchAnimals(accessToken);
    } catch (error) {
      console.error("Error adding daily weight:", error);
      Alert.alert("Error", "Failed to add daily weight");
    } finally {
      setLoading(false);
    }
  };

  const addFeedAdjustment = async (recordId: string) => {
    if (
      !feedAdjustmentForm.concentrateChange ||
      !feedAdjustmentForm.forageChange ||
      !feedAdjustmentForm.reason
    ) {
      Alert.alert("Error", "Required fields are missing");
      return;
    }

    if (!selectedAnimal) {
      Alert.alert("Error", "No animal selected");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/${selectedAnimal._id}/fattening/${recordId}/feed`,
        {
          ...feedAdjustmentForm,
          date: feedAdjustmentForm.date.toISOString(),
          concentrateChange: parseFloat(feedAdjustmentForm.concentrateChange),
          forageChange: parseFloat(feedAdjustmentForm.forageChange),
          costImpact: parseFloat(feedAdjustmentForm.costImpact || "0"),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      Alert.alert("Success", "Feed adjustment added successfully");
      setModalVisible(false);
      fetchAnimals(accessToken);
    } catch (error) {
      console.error("Error adding feed adjustment:", error);
      Alert.alert("Error", "Failed to add feed adjustment");
    } finally {
      setLoading(false);
    }
  };

  // Delete functions
  const deleteHealthRecord = async (recordId: string) => {
    if (!selectedAnimal) return;

    Alert.alert(
      "Delete Health Record",
      "Are you sure you want to delete this health record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await axios.delete(
                `${API_URL}/${selectedAnimal._id}/health/${recordId}`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              );

              Alert.alert("Success", "Health record deleted successfully");
              await fetchAnimals(accessToken);
            } catch (error: any) {
              console.error("Error deleting health record:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete health record"
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const deleteBreedingRecord = async (recordId: string) => {
    if (!selectedAnimal) return;

    Alert.alert(
      "Delete Breeding Record",
      "Are you sure you want to delete this breeding record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await axios.delete(
                `${API_URL}/${selectedAnimal._id}/breeding/${recordId}`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              );

              Alert.alert("Success", "Breeding record deleted successfully");
              await fetchAnimals(accessToken);
            } catch (error: any) {
              console.error("Error deleting breeding record:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete breeding record"
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const deleteWeightRecord = async (recordId: string) => {
    if (!selectedAnimal) return;

    Alert.alert(
      "Delete Weight Record",
      "Are you sure you want to delete this weight record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await axios.delete(
                `${API_URL}/${selectedAnimal._id}/weight/${recordId}`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              );

              Alert.alert("Success", "Weight record deleted successfully");
              await fetchAnimals(accessToken);
            } catch (error: any) {
              console.error("Error deleting weight record:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete weight record"
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const deleteFatteningRecord = async (recordId: string) => {
    if (!selectedAnimal) return;

    Alert.alert(
      "Delete Fattening Record",
      "Are you sure you want to delete this fattening record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await axios.delete(
                `${API_URL}/${selectedAnimal._id}/fattening/${recordId}`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              );

              Alert.alert("Success", "Fattening record deleted successfully");
              await fetchAnimals(accessToken);
            } catch (error: any) {
              console.error("Error deleting fattening record:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete fattening record"
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  interface FormStateMap {
    animal: React.Dispatch<React.SetStateAction<typeof animalForm>>;
    health: React.Dispatch<React.SetStateAction<typeof healthRecordForm>>;
    breeding: React.Dispatch<React.SetStateAction<typeof breedingRecordForm>>;
    weight: React.Dispatch<React.SetStateAction<typeof weightRecordForm>>;
    fattening: React.Dispatch<React.SetStateAction<typeof fatteningRecordForm>>;
    dailyWeight: React.Dispatch<React.SetStateAction<typeof dailyWeightForm>>;
    feedAdjustment: React.Dispatch<React.SetStateAction<typeof feedAdjustmentForm>>;
  }

  type DatePickerField =
    | "animal-dob"
    | "health-date"
    | "breeding-date"
    | "weight-date"
    | "fattening-startDate"
    | "dailyWeight-date"
    | "feedAdjustment-date"
    | "breeding-expectedDeliveryDate"
    | "breeding-actualDeliveryDate"
    | string;

  const handleDateChange = (
    event: any,
    selectedDate?: Date | undefined
  ) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formStateMap: FormStateMap = {
        animal: setAnimalForm,
        health: setHealthRecordForm,
        breeding: setBreedingRecordForm,
        weight: setWeightRecordForm,
        fattening: setFatteningRecordForm,
        dailyWeight: setDailyWeightForm,
        feedAdjustment: setFeedAdjustmentForm,
      };

      const formType = (datePickerField as string).split("-")[0] as keyof FormStateMap;
      const fieldName = (datePickerField as string).split("-")[1];

      if (formType && fieldName && formStateMap[formType]) {
        formStateMap[formType]((prev: any) => ({
          ...prev,
          [fieldName]: selectedDate,
        }));
      }
    }
  };

  const renderAnimalForm = () => (
    <ScrollView style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          {selectedAnimal ? "Edit Animal" : "Register New Animal"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {selectedAnimal && (
            <TouchableOpacity 
              style={[styles.headerIconButton, { marginRight: 12 }]}
              onPress={deleteAnimal}
            >
              <Ionicons name="trash-outline" size={24} color="#f44336" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionLabel}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tag ID *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter tag ID"
            value={animalForm.tagId}
            onChangeText={(text) =>
              setAnimalForm({ ...animalForm, tagId: text.toUpperCase() })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter animal name"
            value={animalForm.name}
            onChangeText={(text) => setAnimalForm({ ...animalForm, name: text })}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Breed *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={animalForm.breed}
                onValueChange={(itemValue) =>
                  setAnimalForm({ ...animalForm, breed: itemValue as string })
                }
                style={styles.picker}
              >
                <Picker.Item label="White Fulani" value="White Fulani" />
                <Picker.Item label="Sokoto Gudali" value="Sokoto Gudali" />
                <Picker.Item label="Ndama" value="Ndama" />
                <Picker.Item label="Holstein" value="Holstein" />
                <Picker.Item label="Jersey" value="Jersey" />
                <Picker.Item label="Other" value="Other" />
              </Picker>
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Sex *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={animalForm.sex}
                onValueChange={(itemValue) =>
                  setAnimalForm({ ...animalForm, sex: itemValue as string })
                }
                style={styles.picker}
              >
                <Picker.Item label="Male" value="Male" />
                <Picker.Item label="Female" value="Female" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Species</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={animalForm.species}
              onValueChange={(itemValue) =>
                setAnimalForm({ ...animalForm, species: itemValue as string })
              }
              style={styles.picker}
            >
              <Picker.Item label="Cattle" value="Cattle" />
              <Picker.Item label="Goat" value="Goat" />
              <Picker.Item label="Sheep" value="Sheep" />
              <Picker.Item label="Pig" value="Pig" />
              <Picker.Item label="Poultry" value="Poultry" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date of Birth *</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => {
              setDatePickerField("animal-dob");
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateText}>{animalForm.dob.toDateString()}</Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Color/Markings</Text>
          <TextInput
            style={styles.input}
            placeholder="Describe color and markings"
            value={animalForm.colorMarkings}
            onChangeText={(text) =>
              setAnimalForm({ ...animalForm, colorMarkings: text })
            }
          />
        </View>
      </View>

      {!selectedAnimal && (
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Initial Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Initial Weight (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter initial weight"
              value={animalForm.initialWeight as any}
              onChangeText={(text) =>
                setAnimalForm({ ...animalForm, initialWeight: text })
              }
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Initial Health Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any initial health observations..."
              value={animalForm.initialHealthNotes as any}
              onChangeText={(text) =>
                setAnimalForm({ ...animalForm, initialHealthNotes: text })
              }
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      )}

      {selectedAnimal && (
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Status</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={animalForm.status}
              onValueChange={(itemValue) =>
                setAnimalForm({ ...animalForm, status: itemValue as string })
              }
              style={styles.picker}
            >
              <Picker.Item label="Active" value="Active" />
              <Picker.Item label="Inactive" value="Inactive" />
              <Picker.Item label="Sold" value="Sold" />
              <Picker.Item label="Deceased" value="Deceased" />
              <Picker.Item label="Under Treatment" value="Under Treatment" />
              <Picker.Item label="Quarantined" value="Quarantined" />
            </Picker>
          </View>
        </View>
      )}

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.primaryButton]}
          onPress={selectedAnimal ? updateAnimal : createAnimal}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.modalButtonText}>
              {selectedAnimal ? "Update Animal" : "Register Animal"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderHealthRecordForm = () => (
    <ScrollView style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Add Health Record</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setModalVisible(false)}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Health Issue *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Fever, Cough, Mastitis"
            value={healthRecordForm.issue}
            onChangeText={(text) =>
              setHealthRecordForm({ ...healthRecordForm, issue: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Treatment *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Antibiotics, Vaccination"
            value={healthRecordForm.treatment}
            onChangeText={(text) =>
              setHealthRecordForm({ ...healthRecordForm, treatment: text })
            }
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => {
                setDatePickerField("health-date");
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.dateText}>{healthRecordForm.date.toDateString()}</Text>
              <Ionicons name="calendar" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Severity</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={healthRecordForm.severity}
                onValueChange={(itemValue) =>
                  setHealthRecordForm({ ...healthRecordForm, severity: itemValue })
                }
                style={styles.picker}
              >
                <Picker.Item label="Low" value="Low" />
                <Picker.Item label="Medium" value="Medium" />
                <Picker.Item label="High" value="High" />
                <Picker.Item label="Critical" value="Critical" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Cost of Treatment (GHS)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={healthRecordForm.cost}
            onChangeText={(text) =>
              setHealthRecordForm({ ...healthRecordForm, cost: text })
            }
            keyboardType="numeric"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Medication</Text>
            <TextInput
              style={styles.input}
              placeholder="Medication name"
              value={healthRecordForm.medication}
              onChangeText={(text) =>
                setHealthRecordForm({ ...healthRecordForm, medication: text })
              }
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Dosage</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 10ml, 2 tablets"
              value={healthRecordForm.dosage}
              onChangeText={(text) =>
                setHealthRecordForm({ ...healthRecordForm, dosage: text })
              }
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Symptoms, observations, follow-up instructions..."
            value={healthRecordForm.notes}
            onChangeText={(text) =>
              setHealthRecordForm({ ...healthRecordForm, notes: text })
            }
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.primaryButton]}
          onPress={addHealthRecord}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.modalButtonText}>Add Health Record</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderBreedingRecordForm = () => (
    <ScrollView style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Add Breeding Record</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setModalVisible(false)}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => {
              setDatePickerField("breeding-date");
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateText}>{breedingRecordForm.date.toDateString()}</Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Breeding Method</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={breedingRecordForm.breedingMethod}
              onValueChange={(itemValue) =>
                setBreedingRecordForm({
                  ...breedingRecordForm,
                  breedingMethod: itemValue,
                })
              }
              style={styles.picker}
            >
              <Picker.Item label="Natural" value="Natural" />
              <Picker.Item label="Artificial Insemination" value="Artificial Insemination" />
              <Picker.Item label="Embryo Transfer" value="Embryo Transfer" />
            </Picker>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Sire ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Sire identification"
              value={breedingRecordForm.sireId}
              onChangeText={(text) =>
                setBreedingRecordForm({ ...breedingRecordForm, sireId: text })
              }
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Sire Breed</Text>
            <TextInput
              style={styles.input}
              placeholder="Sire breed"
              value={breedingRecordForm.sireBreed}
              onChangeText={(text) =>
                setBreedingRecordForm({ ...breedingRecordForm, sireBreed: text })
              }
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Pregnancy Confirmed</Text>
            <Switch
              value={breedingRecordForm.pregnancyConfirmed}
              onValueChange={(value) =>
                setBreedingRecordForm({
                  ...breedingRecordForm,
                  pregnancyConfirmed: value,
                })
              }
              trackColor={{ false: "#f1f1f1", true: "#4CAF50" }}
              thumbColor={breedingRecordForm.pregnancyConfirmed ? "#fff" : "#f4f4f4"}
            />
          </View>
        </View>

        {breedingRecordForm.pregnancyConfirmed && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Expected Delivery Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => {
                setDatePickerField("breeding-expectedDeliveryDate");
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.dateText}>
                {breedingRecordForm.expectedDeliveryDate.toDateString()}
              </Text>
              <Ionicons name="calendar" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Offspring Count</Text>
          <TextInput
            style={styles.input}
            placeholder="Number of offspring"
            value={breedingRecordForm.offspringCount}
            onChangeText={(text) =>
              setBreedingRecordForm({
                ...breedingRecordForm,
                offspringCount: text,
              })
            }
            keyboardType="numeric"
          />
        </View>

        {breedingRecordForm.offspringCount && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Actual Delivery Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => {
                setDatePickerField("breeding-actualDeliveryDate");
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.dateText}>
                {breedingRecordForm.actualDeliveryDate.toDateString()}
              </Text>
              <Ionicons name="calendar" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional breeding notes..."
            value={breedingRecordForm.notes}
            onChangeText={(text) =>
              setBreedingRecordForm({ ...breedingRecordForm, notes: text })
            }
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.primaryButton]}
          onPress={addBreedingRecord}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.modalButtonText}>Add Breeding Record</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderWeightRecordForm = () => (
    <ScrollView style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Add Weight Record</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setModalVisible(false)}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => {
              setDatePickerField("weight-date");
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateText}>{weightRecordForm.date.toDateString()}</Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight (kg) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter weight in kilograms"
            value={weightRecordForm.weight}
            onChangeText={(text) =>
              setWeightRecordForm({ ...weightRecordForm, weight: text })
            }
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Measurement Method</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={weightRecordForm.method}
              onValueChange={(itemValue) =>
                setWeightRecordForm({ ...weightRecordForm, method: itemValue })
              }
              style={styles.picker}
            >
              <Picker.Item label="Scale" value="Scale" />
              <Picker.Item label="Tape" value="Tape" />
              <Picker.Item label="Estimate" value="Estimate" />
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any observations or notes..."
            value={weightRecordForm.notes}
            onChangeText={(text) =>
              setWeightRecordForm({ ...weightRecordForm, notes: text })
            }
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.primaryButton]}
          onPress={addWeightRecord}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.modalButtonText}>Add Weight Record</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderFatteningRecordForm = () => (
    <ScrollView style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Add Fattening Record</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setModalVisible(false)}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionLabel}>Basic Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Start Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => {
              setDatePickerField("fattening-startDate");
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateText}>{fatteningRecordForm.startDate.toDateString()}</Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Initial Weight (kg) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Starting weight"
              value={fatteningRecordForm.initialWeight}
              onChangeText={(text) =>
                setFatteningRecordForm({
                  ...fatteningRecordForm,
                  initialWeight: text,
                })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Target Weight (kg) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Target weight"
              value={fatteningRecordForm.targetWeight}
              onChangeText={(text) =>
                setFatteningRecordForm({
                  ...fatteningRecordForm,
                  targetWeight: text,
                })
              }
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Daily Weight Gain Target (kg) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Target daily gain"
            value={fatteningRecordForm.dailyWeightGainTarget}
            onChangeText={(text) =>
              setFatteningRecordForm({
                ...fatteningRecordForm,
                dailyWeightGainTarget: text,
              })
            }
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Duration (days)</Text>
          <TextInput
            style={styles.input}
            placeholder="Fattening period in days"
            value={fatteningRecordForm.durationDays}
            onChangeText={(text) =>
              setFatteningRecordForm({
                ...fatteningRecordForm,
                durationDays: text,
              })
            }
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionLabel}>Concentrate Feed</Text>
        
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Amount (kg/day)</Text>
            <TextInput
              style={styles.input}
              placeholder="Daily amount"
              value={fatteningRecordForm.dailyConcentrateFeed.amount}
              onChangeText={(text) =>
                setFatteningRecordForm({
                  ...fatteningRecordForm,
                  dailyConcentrateFeed: {
                    ...fatteningRecordForm.dailyConcentrateFeed,
                    amount: text,
                  },
                })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Cost per kg (GHS)</Text>
            <TextInput
              style={styles.input}
              placeholder="Cost per kg"
              value={fatteningRecordForm.dailyConcentrateFeed.costPerKg}
              onChangeText={(text) =>
                setFatteningRecordForm({
                  ...fatteningRecordForm,
                  dailyConcentrateFeed: {
                    ...fatteningRecordForm.dailyConcentrateFeed,
                    costPerKg: text,
                  },
                })
              }
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Composition</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Maize, Soybean, Wheat"
            value={fatteningRecordForm.dailyConcentrateFeed.composition}
            onChangeText={(text) =>
              setFatteningRecordForm({
                ...fatteningRecordForm,
                dailyConcentrateFeed: {
                  ...fatteningRecordForm.dailyConcentrateFeed,
                  composition: text,
                },
              })
            }
          />
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionLabel}>Forage Feed</Text>
        
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Amount (kg/day)</Text>
            <TextInput
              style={styles.input}
              placeholder="Daily amount"
              value={fatteningRecordForm.dailyForageFeed.amount}
              onChangeText={(text) =>
                setFatteningRecordForm({
                  ...fatteningRecordForm,
                  dailyForageFeed: {
                    ...fatteningRecordForm.dailyForageFeed,
                    amount: text,
                  },
                })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Cost per kg (GHS)</Text>
            <TextInput
              style={styles.input}
              placeholder="Cost per kg"
              value={fatteningRecordForm.dailyForageFeed.costPerKg}
              onChangeText={(text) =>
                setFatteningRecordForm({
                  ...fatteningRecordForm,
                  dailyForageFeed: {
                    ...fatteningRecordForm.dailyForageFeed,
                    costPerKg: text,
                  },
                })
              }
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Type</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Grass, Silage, Hay"
            value={fatteningRecordForm.dailyForageFeed.type}
            onChangeText={(text) =>
              setFatteningRecordForm({
                ...fatteningRecordForm,
                dailyForageFeed: {
                  ...fatteningRecordForm.dailyForageFeed,
                  type: text,
                },
              })
            }
          />
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionLabel}>Additional Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Water Requirement (liters/day)</Text>
          <TextInput
            style={styles.input}
            placeholder="Daily water requirement"
            value={fatteningRecordForm.waterRequirement}
            onChangeText={(text) =>
              setFatteningRecordForm({
                ...fatteningRecordForm,
                waterRequirement: text,
              })
            }
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional notes about the fattening program..."
            value={fatteningRecordForm.notes}
            onChangeText={(text) =>
              setFatteningRecordForm({
                ...fatteningRecordForm,
                notes: text,
              })
            }
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.primaryButton]}
          onPress={addFatteningRecord}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.modalButtonText}>Start Fattening Program</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderDailyWeightForm = (recordId: string) => (
    <ScrollView style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Add Daily Weight</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setModalVisible(false)}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => {
              setDatePickerField("dailyWeight-date");
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateText}>{dailyWeightForm.date.toDateString()}</Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight (kg) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter today's weight"
            value={dailyWeightForm.weight}
            onChangeText={(text) =>
              setDailyWeightForm({ ...dailyWeightForm, weight: text })
            }
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any observations about today's weight..."
            value={dailyWeightForm.notes}
            onChangeText={(text) =>
              setDailyWeightForm({ ...dailyWeightForm, notes: text })
            }
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.primaryButton]}
          onPress={() => addDailyWeight(recordId)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.modalButtonText}>Add Daily Weight</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderFeedAdjustmentForm = (recordId: string) => (
    <ScrollView style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Add Feed Adjustment</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setModalVisible(false)}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => {
              setDatePickerField("feedAdjustment-date");
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateText}>{feedAdjustmentForm.date.toDateString()}</Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>Concentrate Change (kg) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Change in amount"
              value={feedAdjustmentForm.concentrateChange}
              onChangeText={(text) =>
                setFeedAdjustmentForm({
                  ...feedAdjustmentForm,
                  concentrateChange: text,
                })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Forage Change (kg) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Change in amount"
              value={feedAdjustmentForm.forageChange}
              onChangeText={(text) =>
                setFeedAdjustmentForm({
                  ...feedAdjustmentForm,
                  forageChange: text,
                })
              }
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Reason *</Text>
          <TextInput
            style={styles.input}
            placeholder="Why is this adjustment needed?"
            value={feedAdjustmentForm.reason}
            onChangeText={(text) =>
              setFeedAdjustmentForm({
                ...feedAdjustmentForm,
                reason: text,
              })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Cost Impact (GHS)</Text>
          <TextInput
            style={styles.input}
            placeholder="Estimated cost impact"
            value={feedAdjustmentForm.costImpact}
            onChangeText={(text) =>
              setFeedAdjustmentForm({
                ...feedAdjustmentForm,
                costImpact: text,
              })
            }
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.primaryButton]}
          onPress={() => addFeedAdjustment(recordId)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.modalButtonText}>Add Feed Adjustment</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderRecordOptions = () => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Add Record for {selectedAnimal?.tagId}</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setModalVisible(false)}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => {
            setRecordType("health");
            setHealthRecordForm({
              issue: "",
              treatment: "",
              date: new Date(),
              cost: "",
              medication: "",
              dosage: "",
              notes: "",
              severity: "Medium",
              followUpRequired: false,
            });
          }}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="medical" size={24} color="#F44336" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Health Record</Text>
            <Text style={styles.optionDescription}>Track illnesses, treatments, and medications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => {
            setRecordType("breeding");
            setBreedingRecordForm({
              date: new Date(),
              breedingMethod: "Natural",
              sireId: "",
              sireBreed: "",
              pregnancyConfirmed: false,
              expectedDeliveryDate: new Date(),
              actualDeliveryDate: new Date(),
              offspringCount: "",
              notes: "",
            });
          }}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="heart" size={24} color="#E91E63" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Breeding Record</Text>
            <Text style={styles.optionDescription}>Track breeding activities and outcomes</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => {
            setRecordType("weight");
            setWeightRecordForm({
              date: new Date(),
              weight: "",
              notes: "",
              method: "Scale",
            });
          }}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="scale" size={24} color="#4CAF50" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Weight Record</Text>
            <Text style={styles.optionDescription}>Track weight measurements and growth</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => {
            setRecordType("fattening");
            setFatteningRecordForm({
              startDate: new Date(),
              initialWeight: "",
              targetWeight: "",
              dailyWeightGainTarget: "",
              dailyConcentrateFeed: {
                amount: "",
                composition: "",
                costPerKg: "",
              },
              dailyForageFeed: {
                amount: "",
                type: "",
                costPerKg: "",
              },
              waterRequirement: "",
              durationDays: "",
              notes: "",
            });
          }}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="trending-up" size={24} color="#FF9800" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Fattening Record</Text>
            <Text style={styles.optionDescription}>Manage fattening programs and progress</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.modalButton, styles.cancelButton, { margin: 20 }]}
        onPress={() => setModalVisible(false)}
      >
        <Text style={styles.modalButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFatteningOptions = (recordId: string) => (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Fattening Management</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setModalVisible(false)}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => {
            setRecordType("dailyWeight");
            setDailyWeightForm({
              date: new Date(),
              weight: "",
              notes: "",
            });
          }}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="speedometer" size={24} color="#2196F3" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Add Daily Weight</Text>
            <Text style={styles.optionDescription}>Record today's weight measurement</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => {
            setRecordType("feedAdjustment");
            setFeedAdjustmentForm({
              date: new Date(),
              concentrateChange: "",
              forageChange: "",
              reason: "",
              costImpact: "",
            });
          }}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="nutrition" size={24} color="#4CAF50" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Adjust Feed</Text>
            <Text style={styles.optionDescription}>Modify feed amounts and composition</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.modalButton, styles.cancelButton, { margin: 20 }]}
        onPress={() => setModalVisible(false)}
      >
        <Text style={styles.modalButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderModalContent = () => {
    if (!selectedAnimal && !recordType) {
      return renderAnimalForm();
    }

    if (!selectedAnimal) {
      return null;
    }

    switch (recordType) {
      case "editAnimal":
        // Open the animal form in edit mode (primary action calls updateAnimal)
        return renderAnimalForm();
      case "health":
        return renderHealthRecordForm();
      case "breeding":
        return renderBreedingRecordForm();
      case "weight":
        return renderWeightRecordForm();
      case "fattening":
        return renderFatteningRecordForm();
      case "dailyWeight":
        const activeFattening = selectedAnimal.fatteningRecords?.find(
          (r) => r.isActive
        );
        if (activeFattening) {
          return renderDailyWeightForm(activeFattening._id);
        }
        return null;
      case "feedAdjustment":
        const activeFatteningForAdjustment = selectedAnimal.fatteningRecords?.find(
          (r) => r.isActive
        );
        if (activeFatteningForAdjustment) {
          return renderFeedAdjustmentForm(activeFatteningForAdjustment._id);
        }
        return null;
      case "fatteningOptions":
        const activeFatteningForOptions = selectedAnimal.fatteningRecords?.find(
          (r) => r.isActive
        );
        if (activeFatteningForOptions) {
          return renderFatteningOptions(activeFatteningForOptions._id);
        }
        return null;
      default:
        return renderRecordOptions();
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  // Add the renderAnimalDetails and other components here...
  // (The rest of the code remains the same as in the previous version)

  // Render a single animal item in the FlatList
  const renderAnimalItem = ({ item }: { item: Animal }) => (
    <TouchableOpacity
      style={styles.animalCard}
      onPress={() => {
        setSelectedAnimal(item);
        setViewMode("details");
      }}
    >
      <View style={styles.animalCardHeader}>
        <View style={styles.animalInfo}>
          <Text style={styles.animalTag}>{item.tagId}</Text>
          {item.name ? <Text style={styles.animalName}>{item.name}</Text> : null}
        </View>
        <View
          style={[
            styles.statusIndicator,
            item.status === "Active"
              ? styles.statusActive
              : item.status === "Under Treatment"
              ? styles.statusTreatment
              : item.status === "Deceased"
              ? styles.statusDeceased
              : item.status === "Quarantined"
              ? styles.statusQuarantined
              : null,
          ]}
        />
      </View>
      <View style={styles.animalDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="paw" size={16} color="#1a237e" />
          <Text style={styles.detailText}>{item.species || "Cattle"}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="git-branch" size={16} color="#1a237e" />
          <Text style={styles.detailText}>{item.breed}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="male-female" size={16} color="#1a237e" />
          <Text style={styles.detailText}>{item.sex}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#1a237e" />
          <Text style={styles.detailText}>
            {typeof item.dob === "string"
              ? new Date(item.dob).toDateString()
              : item.dob.toDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.animalCardFooter}>
        <Text
          style={[
            styles.animalStatus,
            item.status === "Active"
              ? styles.statusActiveText
              : item.status === "Under Treatment"
              ? styles.statusTreatmentText
              : item.status === "Deceased"
              ? styles.statusDeceasedText
              : item.status === "Quarantined"
              ? styles.statusQuarantinedText
              : null,
          ]}
        >
          {item.status}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );

  function renderAnimalDetails(): React.ReactNode {
    if (!selectedAnimal) return null;

    // Helper for status badge color
    const getStatusBadgeStyle = (status: string) => {
      switch (status) {
        case "Active":
          return { backgroundColor: "#4CAF50" };
        case "Under Treatment":
          return { backgroundColor: "#FF9800" };
        case "Deceased":
          return { backgroundColor: "#F44336" };
        case "Quarantined":
          return { backgroundColor: "#9C27B0" };
        default:
          return { backgroundColor: "#607d8b" };
      }
    };

    // Helper for severity badge color
    const getSeverityStyle = (severity: string) => {
      switch (severity) {
        case "Critical":
          return [styles.severityBadge, styles.severityCritical];
        case "High":
          return [styles.severityBadge, styles.severityHigh];
        case "Medium":
          return [styles.severityBadge, styles.severityMedium];
        case "Low":
          return [styles.severityBadge, styles.severityLow];
        default:
          return styles.severityBadge;
      }
    };

    // Helper for section badge count
    const badge = (count: number) =>
      count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null;

    // Health Records
    const healthRecords = selectedAnimal.healthRecords || [];
    // Breeding Records
    const breedingRecords = selectedAnimal.breedingRecords || [];
    // Weight Records
    const weightRecords = selectedAnimal.weightRecords || [];
    // Fattening Records
    const fatteningRecords = selectedAnimal.fatteningRecords || [];

    // Active Fattening Record
    const activeFattening = fatteningRecords.find((r) => r.isActive);

    return (
      <ScrollView>
      <View style={styles.detailsContainer}>
        {/* Header Card */}
        <View style={styles.animalHeaderCard}>
          <View style={styles.animalHeaderMain}>
            <View>
              <Text style={styles.animalHeaderTag}>{selectedAnimal.tagId}</Text>
              {selectedAnimal.name ? (
                <Text style={styles.animalHeaderName}>{selectedAnimal.name}</Text>
              ) : null}
              <Text style={styles.animalHeaderDetails}>
                {selectedAnimal.species || "Cattle"} | {selectedAnimal.breed} | {selectedAnimal.sex}
              </Text>
              <Text style={styles.animalHeaderDetails}>
                DOB:{" "}
                {typeof selectedAnimal.dob === "string"
                  ? new Date(selectedAnimal.dob).toDateString()
                  : selectedAnimal.dob.toDateString()}
              </Text>
              {selectedAnimal.colorMarkings ? (
                <Text style={styles.animalHeaderDetails}>
                  Color/Markings: {selectedAnimal.colorMarkings}
                </Text>
              ) : null}
            </View>
            <View style={[styles.statusBadge, getStatusBadgeStyle(selectedAnimal.status)]}>
              <Text style={styles.statusBadgeText}>{selectedAnimal.status}</Text>
            </View>
          </View>
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                setAnimalForm({
                  tagId: selectedAnimal.tagId,
                  name: selectedAnimal.name || "",
                  breed: selectedAnimal.breed,
                  sex: selectedAnimal.sex,
                  dob:
                    typeof selectedAnimal.dob === "string"
                      ? new Date(selectedAnimal.dob)
                      : selectedAnimal.dob,
                  colorMarkings: selectedAnimal.colorMarkings || "",
                  status: selectedAnimal.status,
                  species: selectedAnimal.species || "Cattle",
                  initialWeight: "",
                  initialHealthNotes: "",
                });
                // Keep the current selection and open the edit form
                setRecordType("editAnimal");
                setModalVisible(true);
              }}
            >
              <Ionicons name="create-outline" size={18} color="#1a237e" />
              <Text style={styles.quickActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                setRecordType("");
                setModalVisible(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#4CAF50" />
              <Text style={styles.quickActionText}>Add Record</Text>
            </TouchableOpacity>
            {/* New: Delete button */}
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={deleteAnimal}
            >
              <Ionicons name="trash-outline" size={18} color="#f44336" />
              <Text style={styles.quickActionText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => setViewMode("list")}
            >
              <Ionicons name="arrow-back" size={18} color="#333" />
              <Text style={styles.quickActionText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Health Records Section */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection("health")}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="medical" size={20} color="#F44336" />
              <Text style={styles.sectionHeaderText}>Health Records</Text>
              {badge(healthRecords.length)}
            </View>
            <Ionicons
              name={expandedSections.health ? "chevron-up" : "chevron-down"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
          {expandedSections.health && (
            <View style={styles.sectionContent}>
              {healthRecords.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="medkit-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyStateText}>No health records</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Add health records to track illnesses and treatments.
                  </Text>
                </View>
              ) : (
                healthRecords
                  .slice()
                  .reverse()
                  .map((rec: any, idx) => (
                    <View key={rec._id || idx} style={styles.recordCard}>
                      <View style={styles.recordHeader}>
                        <Text style={styles.recordTitle}>{rec.issue}</Text>
                        <View style={getSeverityStyle(rec.severity)}>
                          <Text style={styles.severityText}>{rec.severity}</Text>
                        </View>
                      </View>
                      <View style={styles.recordDetails}>
                        <Text style={styles.recordDetail}>
                          <Text style={styles.recordLabel}>Date: </Text>
                          {typeof rec.date === "string"
                            ? new Date(rec.date).toDateString()
                            : rec.date.toDateString()}
                        </Text>
                        <Text style={styles.recordDetail}>
                          <Text style={styles.recordLabel}>Treatment: </Text>
                          {rec.treatment}
                        </Text>
                        {rec.medication ? (
                          <Text style={styles.recordDetail}>
                            <Text style={styles.recordLabel}>Medication: </Text>
                            {rec.medication}
                          </Text>
                        ) : null}
                        {rec.dosage ? (
                          <Text style={styles.recordDetail}>
                            <Text style={styles.recordLabel}>Dosage: </Text>
                            {rec.dosage}
                          </Text>
                        ) : null}
                        {rec.cost ? (
                          <Text style={styles.recordDetail}>
                            <Text style={styles.recordLabel}>Cost: </Text>
                            GHS {rec.cost}
                          </Text>
                        ) : null}
                        {rec.notes ? (
                          <Text style={styles.recordDetail}>
                            <Text style={styles.recordLabel}>Notes: </Text>
                            {rec.notes}
                          </Text>
                        ) : null}
                        {rec.followUpRequired ? (
                          <View style={styles.followUpAlert}>
                            <Ionicons name="alert-circle" size={16} color="#e65100" />
                            <Text style={styles.followUpText}>
                              Follow-up required
                              {rec.followUpDate
                                ? ` on ${
                                    typeof rec.followUpDate === "string"
                                      ? new Date(rec.followUpDate).toDateString()
                                      : rec.followUpDate.toDateString()
                                  }`
                                : ""}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={styles.deleteRecordButton}
                        onPress={() => {
                          if (rec._id) deleteHealthRecord(rec._id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#f44336" />
                      </TouchableOpacity>
                    </View>
                  ))
              )}
              <TouchableOpacity
                style={styles.addRecordButton}
                onPress={() => {
                  setRecordType("health");
                  setModalVisible(true);
                }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addRecordButtonText}>Add Health Record</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Breeding Records Section */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection("breeding")}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="heart" size={20} color="#E91E63" />
              <Text style={styles.sectionHeaderText}>Breeding Records</Text>
              {badge(breedingRecords.length)}
            </View>
            <Ionicons
              name={expandedSections.breeding ? "chevron-up" : "chevron-down"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
          {expandedSections.breeding && (
            <View style={styles.sectionContent}>
              {breedingRecords.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="egg-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyStateText}>No breeding records</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Add breeding records to track activities and outcomes.
                  </Text>
                </View>
              ) : (
                breedingRecords
                  .slice()
                  .reverse()
                  .map((rec, idx) => (
                    <View key={rec._id || idx} style={styles.recordCard}>
                      <View style={styles.recordHeader}>
                        <Text style={styles.recordTitle}>
                          {rec.breedingMethod} Breeding
                        </Text>
                        <Text style={styles.recordDate}>
                          {typeof rec.date === "string"
                            ? new Date(rec.date).toDateString()
                            : rec.date.toDateString()}
                        </Text>
                      </View>
                      <View style={styles.recordDetails}>
                        {rec.sireId ? (
                          <Text style={styles.recordDetail}>
                            <Text style={styles.recordLabel}>Sire ID: </Text>
                            {rec.sireId}
                          </Text>
                        ) : null}
                        {rec.sireBreed ? (
                          <Text style={styles.recordDetail}>
                            <Text style={styles.recordLabel}>Sire Breed: </Text>
                            {rec.sireBreed}
                          </Text>
                        ) : null}
                        <Text style={styles.recordDetail}>
                          <Text style={styles.recordLabel}>Pregnancy Confirmed: </Text>
                          {rec.pregnancyConfirmed ? "Yes" : "No"}
                        </Text>
                        {rec.expectedDeliveryDate && rec.pregnancyConfirmed ? (
                          <Text style={styles.recordDetail}>
                            <Text style={styles.recordLabel}>Expected Delivery: </Text>
                            {typeof rec.expectedDeliveryDate === "string"
                              ? new Date(rec.expectedDeliveryDate).toDateString()
                              : rec.expectedDeliveryDate.toDateString()}
                          </Text>
                        ) : null}
                        {rec.offspringCount ? (
                          <Text style={styles.recordDetail}>
                            <Text style={styles.recordLabel}>Offspring Count: </Text>
                            {rec.offspringCount}
                          </Text>
                        ) : null}
                        {rec.actualDeliveryDate && rec.offspringCount ? (
                          <Text style={styles.recordDetail}>
                            <Text style={styles.recordLabel}>Actual Delivery: </Text>
                            {typeof rec.actualDeliveryDate === "string"
                              ? new Date(rec.actualDeliveryDate).toDateString()
                              : rec.actualDeliveryDate.toDateString()}
                          </Text>
                        ) : null}
                        {rec.notes ? (
                          <Text style={styles.recordDetail}>
                            <Text style={styles.recordLabel}>Notes: </Text>
                            {rec.notes}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={styles.deleteRecordButton}
                        onPress={() => {
                          if (rec._id) deleteBreedingRecord(rec._id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#f44336" />
                      </TouchableOpacity>
                    </View>
                  ))
              )}
              <TouchableOpacity
                style={styles.addRecordButton}
                onPress={() => {
                  setRecordType("breeding");
                  setModalVisible(true);
                }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addRecordButtonText}>Add Breeding Record</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Weight Records Section */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection("weight")}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="scale" size={20} color="#4CAF50" />
              <Text style={styles.sectionHeaderText}>Weight Records</Text>
              {badge(weightRecords.length)}
            </View>
            <Ionicons
              name={expandedSections.weight ? "chevron-up" : "chevron-down"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
          {expandedSections.weight && (
            <View style={styles.sectionContent}>
              {weightRecords.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="barbell-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyStateText}>No weight records</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Add weight records to track growth and progress.
                  </Text>
                </View>
              ) : (
                weightRecords
                  .slice()
                  .reverse()
                  .map((rec, idx) => {
                    // Get the original index to find the _id
                    const originalIndex = weightRecords.length - 1 - idx;
                    const recordId = weightRecords[originalIndex]._id;
                    
                    return (
                      <View key={recordId || idx} style={styles.recordCard}>
                        <View style={styles.recordHeader}>
                          <Text style={styles.recordTitle}>
                            {rec.weight} kg
                          </Text>
                          <Text style={styles.recordDate}>
                            {typeof rec.date === "string"
                              ? new Date(rec.date).toDateString()
                              : rec.date.toDateString()}
                          </Text>
                        </View>
                        <View style={styles.recordDetails}>
                          <Text style={styles.recordDetail}>
                            <Text style={styles.recordLabel}>Method: </Text>
                            {rec.method}
                          </Text>
                          {rec.notes ? (
                            <Text style={styles.recordDetail}>
                              <Text style={styles.recordLabel}>Notes: </Text>
                              {rec.notes}
                            </Text>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          style={styles.deleteRecordButton}
                          onPress={() => {
                            if (recordId) deleteWeightRecord(recordId);
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#f44336" />
                        </TouchableOpacity>
                      </View>
                    );
                  })
              )}
              <TouchableOpacity
                style={styles.addRecordButton}
                onPress={() => {
                  setRecordType("weight");
                  setModalVisible(true);
                }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addRecordButtonText}>Add Weight Record</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Fattening Records Section */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection("fattening")}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="trending-up" size={20} color="#FF9800" />
              <Text style={styles.sectionHeaderText}>Fattening Records</Text>
              {badge(fatteningRecords.length)}
            </View>
            <Ionicons
              name={expandedSections.fattening ? "chevron-up" : "chevron-down"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
          {expandedSections.fattening && (
            <View style={styles.sectionContent}>
              {fatteningRecords.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="nutrition-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyStateText}>No fattening records</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Add fattening records to manage programs and progress.
                  </Text>
                </View>
              ) : (
                fatteningRecords
                  .slice()
                  .reverse()
                  .map((rec, idx) => (
                    <View key={rec._id || idx} style={styles.recordCard}>
                      <View style={styles.recordHeader}>
                        <Text style={styles.recordTitle}>
                          Fattening Program
                          {rec.isActive ? " (Active)" : ""}
                        </Text>
                        <Text style={styles.recordDate}>
                          {rec.startDate
                            ? typeof rec.startDate === "string"
                              ? new Date(rec.startDate).toDateString()
                              : rec.startDate.toDateString()
                            : ""}
                        </Text>
                      </View>
                      <View style={styles.recordDetails}>
                        <Text style={styles.recordDetail}>
                          <Text style={styles.recordLabel}>Initial Weight: </Text>
                          {rec.initialWeight} kg
                        </Text>
                        <Text style={styles.recordDetail}>
                          <Text style={styles.recordLabel}>Target Weight: </Text>
                          {rec.targetWeight} kg
                        </Text>
                        <Text style={styles.recordDetail}>
                          <Text style={styles.recordLabel}>Daily Gain Target: </Text>
                          {rec.dailyWeightGainTarget} kg
                        </Text>
                        <Text style={styles.recordDetail}>
                          <Text style={styles.recordLabel}>Duration: </Text>
                          {rec.durationDays} days
                        </Text>
                        <Text style={styles.recordDetail}>
                          <Text style={styles.recordLabel}>Concentrate Feed: </Text>
                          {rec.dailyConcentrateFeed?.amount} kg/day, {rec.dailyConcentrateFeed?.composition}
                        </Text>
                        <Text style={styles.recordDetail}>
                          <Text style={styles.recordLabel}>Forage Feed: </Text>
                          {rec.dailyForageFeed?.amount} kg/day, {rec.dailyForageFeed?.type}
                        </Text>
                        <Text style={styles.recordDetail}>
                          <Text style={styles.recordLabel}>Water Requirement: </Text>
                          {rec.waterRequirement} liters/day
                        </Text>
                        {rec.notes ? (
                          <Text style={styles.recordDetail}>
                            <Text style={styles.recordLabel}>Notes: </Text>
                            {rec.notes}
                          </Text>
                        ) : null}
                        {/* Daily Weights */}
                        {rec.actualDailyGain && rec.actualDailyGain.length > 0 && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={styles.recordLabel}>Daily Weights:</Text>
                            {rec.actualDailyGain
                              .slice()
                              .reverse()
                              .map((w, i) => (
                                <Text key={i} style={styles.recordDetail}>
                                  {typeof w.date === "string"
                                    ? new Date(w.date).toDateString()
                                    : w.date.toDateString()}
                                  : {w.weight} kg {w.notes ? `- ${w.notes}` : ""}
                                </Text>
                              ))}
                          </View>
                        )}
                        {/* Feed Adjustments */}
                        {rec.feedAdjustments && rec.feedAdjustments.length > 0 && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={styles.recordLabel}>Feed Adjustments:</Text>
                            {rec.feedAdjustments
                              .slice()
                              .reverse()
                              .map((f, i) => (
                                <Text key={i} style={styles.recordDetail}>
                                  {typeof f.date === "string"
                                    ? new Date(f.date).toDateString()
                                    : f.date.toDateString()}
                                  : +{f.concentrateChange}kg concentrate, +{f.forageChange}kg forage
                                  {f.reason ? ` (${f.reason})` : ""}
                                  {f.costImpact ? `, Cost: GHS ${f.costImpact}` : ""}
                                </Text>
                              ))}
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        {rec.isActive && (
                          <TouchableOpacity
                            style={styles.addRecordButton}
                            onPress={() => {
                              setRecordType("fatteningOptions");
                              setModalVisible(true);
                            }}
                          >
                            <Ionicons name="add" size={18} color="#fff" />
                            <Text style={styles.addRecordButtonText}>
                              Fattening Actions
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.deleteRecordButton}
                          onPress={() => deleteFatteningRecord(rec._id)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#f44336" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
              )}
              <TouchableOpacity
                style={styles.addRecordButton}
                onPress={() => {
                  setRecordType("fattening");
                  setModalVisible(true);
                }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addRecordButtonText}>Add Fattening Record</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      </ScrollView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1a237e" barStyle="light-content" />
      
      {viewMode === "list" && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Livestock Management</Text>
          <Text style={styles.headerSubtitle}>Manage your animals and records</Text>
        </View>
      )}

      {viewMode === "list" && (
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search animals..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Status:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {["All", "Active", "Under Treatment", "Quarantined", "Deceased"].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    filterStatus === status && styles.filterChipActive
                  ]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterStatus === status && styles.filterChipTextActive
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {loading && !modalVisible ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading animals...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchAnimals(accessToken)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === "details" ? (
        renderAnimalDetails()
      ) : (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              Animals ({filteredAnimals.length})
            </Text>
          </View>
          
          <FlatList
            data={filteredAnimals}
            renderItem={renderAnimalItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="paw-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No animals found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery || filterStatus !== "All" 
                    ? "Try adjusting your search or filters" 
                    : "Get started by adding your first animal"
                  }
                </Text>
              </View>
            }
          />
        </>
      )}

      {viewMode === "list" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setSelectedAnimal(null);
            setAnimalForm({
              tagId: "",
              name: "",
              breed: "White Fulani",
              sex: "Male",
              dob: new Date(),
              colorMarkings: "",
              status: "Active",
              species: "Cattle",
              initialWeight: "",
              initialHealthNotes: "",
            });
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {renderModalContent()}
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={
            datePickerField === "animal-dob"
              ? animalForm.dob
              : datePickerField === "health-date"
              ? healthRecordForm.date
              : datePickerField === "breeding-date"
              ? breedingRecordForm.date
              : datePickerField === "weight-date"
              ? weightRecordForm.date
              : datePickerField === "fattening-startDate"
              ? fatteningRecordForm.startDate
              : datePickerField === "dailyWeight-date"
              ? dailyWeightForm.date
              : feedAdjustmentForm.date
          }
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#1a237e",
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#e8eaf6",
  },
  searchSection: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginRight: 12,
  },
  filterScroll: {
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#1a237e",
  },
  filterChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  listHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  animalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  animalCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  animalInfo: {
    flex: 1,
  },
  animalTag: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a237e",
    marginBottom: 4,
  },
  animalName: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  animalDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  animalCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  animalStatus: {
    fontSize: 14,
    fontWeight: "600",
  },
  statusActive: {
    backgroundColor: "#4CAF50",
  },
  statusTreatment: {
    backgroundColor: "#FF9800",
  },
  statusDeceased: {
    backgroundColor: "#F44336",
  },
  statusQuarantined: {
    backgroundColor: "#9C27B0",
  },
  statusActiveText: {
    color: "#4CAF50",
  },
  statusTreatmentText: {
    color: "#FF9800",
  },
  statusDeceasedText: {
    color: "#F44336",
  },
  statusQuarantinedText: {
    color: "#9C27B0",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1a237e",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#f44336",
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#1a237e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: "#999",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  formSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#006a02ff",
  },
  cancelButton: {
    backgroundColor: "#f91818ff",
  },
  deleteButton: {
    backgroundColor: "#f44336",
    margin: 20,
    marginTop: 0,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  optionsContainer: {
    padding: 20,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fafafa",
    borderRadius: 12,
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: "#666",
  },
  // Add any additional styles needed for the animal details view
  detailsContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  animalHeaderCard: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  animalHeaderMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  animalHeaderTag: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a237e",
    marginBottom: 4,
  },
  animalHeaderName: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
    marginBottom: 4,
  },
  animalHeaderDetails: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  sectionCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
    marginRight: 8,
  },
  badge: {
    backgroundColor: "#1a237e",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
  },
  recordCard: {
    backgroundColor: "#fafafa",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1a237e",
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  recordDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  severityCritical: {
    backgroundColor: "#f44336",
  },
  severityHigh: {
    backgroundColor: "#ff9800",
  },
  severityMedium: {
    backgroundColor: "#ffc107",
  },
  severityLow: {
    backgroundColor: "#8bc34a",
  },
  recordDetails: {
    marginBottom: 12,
  },
  recordDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    lineHeight: 20,
  },
  recordLabel: {
    fontWeight: "600",
    color: "#333",
  },
  followUpAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3e0",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  followUpText: {
    fontSize: 12,
    color: "#e65100",
    marginLeft: 6,
    fontWeight: "500",
  },
  deleteRecordButton: {
    alignSelf: "flex-end",
    padding: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
    fontWeight: "600",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  addRecordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a237e",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addRecordButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default LivestockTab;