import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Animal, WeightRecord, FatteningRecord, DailyWeight, FeedAdjustment } from '../types/Animal';

interface LivestockState {
  livestock: Animal[];
  loading: boolean;
  error: string | null;
}

const initialState: LivestockState = {
  livestock: [],
  loading: false,
  error: null,
};

const livestockSlice = createSlice({
  name: 'livestock',
  initialState,
  reducers: {
    // Set loading state
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },

    // Set error message
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },

    // Set the entire livestock array
    setLivestock(state, action: PayloadAction<Animal[]>) {
      state.livestock = action.payload;
      state.loading = false;
      state.error = null;
    },

    // Add a single animal
    addLivestock(state, action: PayloadAction<Animal>) {
      state.livestock.push(action.payload);
      state.loading = false;
      state.error = null;
    },

    // Update an existing animal
    updateLivestock(state, action: PayloadAction<Animal>) {
      const index = state.livestock.findIndex(animal => animal._id === action.payload._id);
      if (index !== -1) {
        state.livestock[index] = action.payload;
      }
      state.loading = false;
      state.error = null;
    },

    // Delete an animal
    deleteLivestock(state, action: PayloadAction<string>) {
      state.livestock = state.livestock.filter(animal => animal._id !== action.payload);
      state.loading = false;
      state.error = null;
    },

    // Add weight record to an animal
    addWeightRecord(state, action: PayloadAction<{ animalId: string; record: WeightRecord }>) {
      const animal = state.livestock.find(a => a._id === action.payload.animalId);
      if (animal) {
        animal.weightRecords.push(action.payload.record);
      }
    },

    // Add fattening record to an animal
    addFatteningRecord(state, action: PayloadAction<{ animalId: string; record: FatteningRecord }>) {
      const animal = state.livestock.find(a => a._id === action.payload.animalId);
      if (animal) {
        // Deactivate all other fattening records
        animal.fatteningRecords.forEach(record => {
          record.isActive = false;
        });
        animal.fatteningRecords.push(action.payload.record);
      }
    },

    // Add daily weight to fattening record
    addDailyWeightToFattening(
      state,
      action: PayloadAction<{ animalId: string; recordId: string; weight: DailyWeight }>
    ) {
      const animal = state.livestock.find(a => a._id === action.payload.animalId);
      if (animal) {
        const record = animal.fatteningRecords.find(r => r._id === action.payload.recordId);
        if (record) {
          record.actualDailyGain.push(action.payload.weight);
          
          // Update performance metrics
          if (record.actualDailyGain.length > 1) {
            const days = (new Date(action.payload.weight.date).getTime() - 
                         new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24);
            const weightGain = action.payload.weight.weight - record.initialWeight;
            record.actualADG = weightGain / days;
            
            const totalFeedCost = record.dailyConcentrateFeed.amount * record.dailyConcentrateFeed.costPerKg +
                                record.dailyForageFeed.amount * record.dailyForageFeed.costPerKg;
            record.totalFeedCost = totalFeedCost * days;
            record.totalWeightGain = weightGain;
            record.feedConversionRatio = weightGain > 0 ? 
              (totalFeedCost * days) / weightGain : 0;
          }
        }
      }
    },

    // Add feed adjustment to fattening record
    addFeedAdjustment(
      state,
      action: PayloadAction<{ animalId: string; recordId: string; adjustment: FeedAdjustment }>
    ) {
      const animal = state.livestock.find(a => a._id === action.payload.animalId);
      if (animal) {
        const record = animal.fatteningRecords.find(r => r._id === action.payload.recordId);
        if (record) {
          record.feedAdjustments.push(action.payload.adjustment);
          record.dailyConcentrateFeed.amount += action.payload.adjustment.concentrateChange;
          record.dailyForageFeed.amount += action.payload.adjustment.forageChange;
        }
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setLivestock,
  addLivestock,
  updateLivestock,
  deleteLivestock,
  addWeightRecord,
  addFatteningRecord,
  addDailyWeightToFattening,
  addFeedAdjustment,
} = livestockSlice.actions;

export default livestockSlice.reducer;