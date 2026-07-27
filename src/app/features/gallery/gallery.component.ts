import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GalleryService } from '../../core/services/gallery.service';
import { ToastService } from '../../core/services/toast.service';
import { GalleryItem } from '../../models/gallery.model';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.css']
})
export class GalleryComponent implements OnInit {
  galleryItems: GalleryItem[] = [];
  
  newImageTitle = '';
  selectedFile: File | null = null;
  selectedFilePreview: string | null = null;
  selectedFileName = '';
  selectedFileSize = 0;
  
  fileSizeError = '';
  isUploading = false;
  isFetching = false;
  isDeletingId: string | null = null;
  isDragging = false;

  constructor(
    private galleryService: GalleryService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchGallery();
  }

  fetchGallery(): void {
    this.isFetching = true;
    this.galleryService.getGalleryItems().subscribe({
      next: (res) => {
        this.isFetching = false;
        if (res.success && res.data) {
          this.galleryItems = res.data;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isFetching = false;
        this.toastService.error('Error al cargar la galería de imágenes.');
        this.cdr.detectChanges();
      }
    });
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  // Drag and drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(): void {
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  processFile(file: File): void {
    this.fileSizeError = '';
    
    // Validate image format
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.fileSizeError = 'Formato de imagen no soportado. Usa JPG, JPEG, PNG o WEBP.';
      this.clearSelectedFile();
      return;
    }

    // Validate size (2MB limit)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      this.fileSizeError = `La imagen supera el límite de 2MB. Peso actual: ${(file.size / 1024 / 1024).toFixed(2)}MB.`;
      this.clearSelectedFile();
      return;
    }

    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.selectedFileSize = file.size;

    // Create base64 preview
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedFilePreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  clearSelectedFile(): void {
    this.selectedFile = null;
    this.selectedFilePreview = null;
    this.selectedFileName = '';
    this.selectedFileSize = 0;
  }

  onUploadSubmit(event: Event): void {
    event.preventDefault();
    
    if (!this.newImageTitle.trim()) {
      this.toastService.error('El título es obligatorio.');
      return;
    }

    if (!this.selectedFile) {
      this.toastService.error('Debes seleccionar una imagen para subir.');
      return;
    }

    if (this.fileSizeError) {
      this.toastService.error(this.fileSizeError);
      return;
    }

    this.isUploading = true;
    this.galleryService.createGalleryItem(this.newImageTitle, this.selectedFile).subscribe({
      next: (res) => {
        this.isUploading = false;
        if (res.success && res.data) {
          this.toastService.success('Imagen subida correctamente a la galería.');
          // Prepend new item to list
          this.galleryItems.unshift(res.data);
          
          // Reset form
          this.newImageTitle = '';
          this.clearSelectedFile();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isUploading = false;
        const msg = err.error?.message || 'Error al subir la imagen a la galería.';
        this.toastService.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  onDeleteItem(item: GalleryItem): void {
    const itemId = item._id || item.id;
    if (!itemId) return;

    if (confirm(`¿Estás seguro de que deseas eliminar la imagen "${item.title}" de la galería?`)) {
      this.isDeletingId = itemId;
      this.galleryService.deleteGalleryItem(itemId).subscribe({
        next: (res) => {
          this.isDeletingId = null;
          if (res.success) {
            this.toastService.success('Imagen eliminada de la galería.');
            this.galleryItems = this.galleryItems.filter(g => (g._id || g.id) !== itemId);
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isDeletingId = null;
          this.toastService.error('Error al eliminar la imagen.');
          this.cdr.detectChanges();
        }
      });
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  }
}
