export interface WeightRecord {
  date: string;
  weight: number;
  measuredBy: string;
  notes: string;
  method?: 'Scale' | 'Tape' | 'Estimate';
}

export interface HealthRecord {
  issue: string;
  treatment: string;
  date: string;
  cost?: number;
  medication?: string;
  dosage?: string;
  administeredBy?: string;
  notes?: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  followUpRequired: boolean;
  followUpDate?: string;
}

export interface BreedingRecord {
  date: string;
  breedingMethod?: 'Natural' | 'Artificial Insemination' | 'Embryo Transfer';
  sireId?: string;
  sireBreed?: string;
  technician?: string;
  pregnancyConfirmed?: boolean;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  offspringCount?: number;
  notes?: string;
  success?: boolean;
}

export interface FeedAdjustment {
  date: string;
  concentrateChange: number;
  forageChange: number;
  reason: string;
  adjustedBy: string;
  costImpact: number;
}

export interface DailyWeight {
  date: string;
  weight: number;
  notes: string;
  measuredBy: string;
}

export interface FatteningRecord {
  _id?: string;
  startDate: string;
  initialWeight: number;
  targetWeight: number;
  dailyWeightGainTarget: number;
  dailyConcentrateFeed: {
    amount: number;
    composition: string;
    costPerKg: number;
  };
  dailyForageFeed: {
    amount: number;
    type: string;
    costPerKg: number;
  };
  waterRequirement: number;
  durationDays: number;
  notes: string;
  isActive: boolean;
  actualDailyGain: DailyWeight[];
  feedAdjustments: FeedAdjustment[];
  actualADG?: number;
  totalFeedCost?: number;
  totalWeightGain?: number;
  feedConversionRatio?: number;
}

export interface Animal {
  _id: string;
  tagId: string;
  name?: string;
  breed: 'White Fulani' | 'Sokoto Gudali' | 'Ndama' | 'Other';
  sex: 'Male' | 'Female';
  dob: string;
  colorMarkings?: string;
  photoUrl?: string;
  status: 'Active' | 'Inactive' | 'Sold' | 'Deceased' | 'Under Treatment' | 'Quarantined';
  healthStatus: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  currentValue?: number;
  insuranceInfo?: {
    policyNumber?: string;
    provider?: string;
    coverageAmount?: number;
    expiryDate?: string;
  };
  healthRecords: HealthRecord[];
  breedingRecords: BreedingRecord[];
  weightRecords: WeightRecord[];
  fatteningRecords: FatteningRecord[];
  createdBy: string;
  roleAtCreation: string;
  farm?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}