// src/utils/livestockUtils.ts
import moment from 'moment';

export const calculateAge = (dob: string | Date): string => {
  if (!dob) return 'Unknown';
  const birthDate = moment(dob);
  const now = moment();
  
  const years = now.diff(birthDate, 'years');
  birthDate.add(years, 'years');
  
  const months = now.diff(birthDate, 'months');
  birthDate.add(months, 'months');
  
  const days = now.diff(birthDate, 'days');
  
  let ageString = '';
  if (years > 0) ageString += `${years} year${years > 1 ? 's' : ''} `;
  if (months > 0) ageString += `${months} month${months > 1 ? 's' : ''} `;
  if (days > 0 && years < 1) ageString += `${days} day${days > 1 ? 's' : ''}`;
  
  return ageString.trim() || '0 days';
};

export const calculateWeightGain = (weightRecords: any[]): { gain: number, days: number, adg: number } | null => {
  if (!weightRecords || weightRecords.length < 2) return null;
  
  const sortedRecords = [...weightRecords].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const firstRecord = sortedRecords[0];
  const lastRecord = sortedRecords[sortedRecords.length - 1];
  
  const weightGain = lastRecord.weight - firstRecord.weight;
  const days = moment(lastRecord.date).diff(moment(firstRecord.date), 'days');
  const adg = days > 0 ? weightGain / days : 0;
  
  return {
    gain: weightGain,
    days,
    adg: parseFloat(adg.toFixed(2))
  };
};

export const getCurrentWeight = (weightRecords: any[]): number | null => {
  if (!weightRecords || weightRecords.length === 0) return null;
  
  const sortedRecords = [...weightRecords].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  return sortedRecords[0].weight;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
};