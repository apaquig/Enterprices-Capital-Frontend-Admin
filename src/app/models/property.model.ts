export interface PropertyImage {
  _id?: string;
  url: string;
  fileName?: string;
  filePath?: string;
  alt?: string;
  isMain?: boolean;
  order?: number;
  uploadedAt?: string;
}

export interface Property {
  _id?: string;
  id?: string; // For compatibility
  propertyName?: string;
  name?: string; // For compatibility
  propertyType?: 'house' | 'apartment' | 'land' | 'commercial' | 'multifamily' | 'office' | 'other';
  type?: 'house' | 'apartment' | 'land' | 'commercial' | 'multifamily' | 'office' | 'other'; // For compatibility
  country: 'Ecuador' | 'USA';
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  description?: string;
  currentPrice: number;
  previousPrice?: number;
  currency?: 'USD';
  propertyStatus?: 'available' | 'reserved' | 'sold' | 'rented' | 'inactive';
  status?: 'available' | 'reserved' | 'sold' | 'rented' | 'inactive'; // For compatibility
  operationType?: 'sale' | 'rent' | 'investment';
  bedrooms?: number;
  bathrooms?: number;
  areaSize?: number;
  area?: number; // For compatibility
  areaUnit?: 'sqft' | 'm2';
  lotSize?: number;
  yearBuilt?: number;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  responsibleAgent?: string;
  agent?: string; // For compatibility
  estimatedCommission?: number;
  imageUrl?: string;
  imagePublicId?: string;
  internalNotes?: string;
  notes?: string; // For compatibility
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  images?: PropertyImage[];
  activeImageIndex?: number;
  hasImageError?: boolean;
}
