export interface Farmland {
  id: string;
  name: string;
  location: string;
  size: number; // in acres
  price: number; // price per acre
  description: string;
  images: string[]; // array of image URLs
  available: boolean; // indicates if the farmland is available for rent or sale
}

export interface Inquiry {
  id: string;
  userId: string;
  farmlandId: string;
  farmlandName: string; // Add this property
  userName: string;     // Add this property
  inquiryType: 'rent' | 'buy';
  message: string;
  contactInfo: {
    phone: string;
    email: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}