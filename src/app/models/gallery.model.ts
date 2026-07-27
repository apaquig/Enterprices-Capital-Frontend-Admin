export interface GalleryItem {
  _id?: string;
  id?: string;
  title: string;
  imageUrl: string;
  publicId: string;
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}
