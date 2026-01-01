import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Trash2,
  Star,
  StarOff,
  Image as ImageIcon,
  X,
  Plus,
  GripVertical,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Property {
  id: string;
  title: string;
  location: string;
  price: string;
  beds: number;
  baths: number;
  sqft: string;
  featured: boolean;
  primary_image_url: string | null;
}

interface PropertyImage {
  id: string;
  property_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

const PropertyPhotoManager = () => {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching properties",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPropertyImages = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", propertyId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPropertyImages(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching images",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchPropertyImages(selectedProperty.id);
    } else {
      setPropertyImages([]);
    }
  }, [selectedProperty]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (!selectedProperty) return;

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );

      if (files.length === 0) {
        toast({
          title: "Invalid files",
          description: "Please drop image files only",
          variant: "destructive",
        });
        return;
      }

      await uploadImages(files);
    },
    [selectedProperty]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProperty || !e.target.files) return;

    const files = Array.from(e.target.files);
    await uploadImages(files);
    e.target.value = "";
  };

  const uploadImages = async (files: File[]) => {
    if (!selectedProperty) return;

    setIsUploading(true);
    const maxOrder =
      propertyImages.length > 0
        ? Math.max(...propertyImages.map((img) => img.display_order))
        : -1;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${selectedProperty.id}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("property-images").getPublicUrl(fileName);

        const isPrimary = propertyImages.length === 0 && i === 0;

        const { error: insertError } = await supabase
          .from("property_images")
          .insert({
            property_id: selectedProperty.id,
            image_url: publicUrl,
            is_primary: isPrimary,
            display_order: maxOrder + 1 + i,
          });

        if (insertError) throw insertError;

        // Update property's primary image if this is the first image
        if (isPrimary) {
          await supabase
            .from("properties")
            .update({ primary_image_url: publicUrl })
            .eq("id", selectedProperty.id);

          setSelectedProperty((prev) =>
            prev ? { ...prev, primary_image_url: publicUrl } : null
          );
        }
      }

      await fetchPropertyImages(selectedProperty.id);
      toast({
        title: "Images uploaded",
        description: `${files.length} image(s) uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetPrimary = async (image: PropertyImage) => {
    if (!selectedProperty) return;

    try {
      // Reset all images to non-primary
      await supabase
        .from("property_images")
        .update({ is_primary: false })
        .eq("property_id", selectedProperty.id);

      // Set selected image as primary
      await supabase
        .from("property_images")
        .update({ is_primary: true })
        .eq("id", image.id);

      // Update property's primary image
      await supabase
        .from("properties")
        .update({ primary_image_url: image.image_url })
        .eq("id", selectedProperty.id);

      setSelectedProperty((prev) =>
        prev ? { ...prev, primary_image_url: image.image_url } : null
      );

      await fetchPropertyImages(selectedProperty.id);
      toast({
        title: "Primary photo updated",
        description: "The primary photo has been updated",
      });
    } catch (error: any) {
      toast({
        title: "Error updating primary photo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteImage = async (image: PropertyImage) => {
    if (!selectedProperty) return;

    try {
      // Extract file path from URL
      const urlParts = image.image_url.split("/property-images/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("property-images").remove([filePath]);
      }

      await supabase.from("property_images").delete().eq("id", image.id);

      // If this was the primary image, set another one as primary
      if (image.is_primary) {
        const remainingImages = propertyImages.filter(
          (img) => img.id !== image.id
        );
        if (remainingImages.length > 0) {
          await supabase
            .from("property_images")
            .update({ is_primary: true })
            .eq("id", remainingImages[0].id);

          await supabase
            .from("properties")
            .update({ primary_image_url: remainingImages[0].image_url })
            .eq("id", selectedProperty.id);
        } else {
          await supabase
            .from("properties")
            .update({ primary_image_url: null })
            .eq("id", selectedProperty.id);
        }
      }

      await fetchPropertyImages(selectedProperty.id);
      toast({
        title: "Image deleted",
        description: "The image has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Property Grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Property Photos</h2>
        <Button variant="outline" onClick={fetchProperties} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : properties.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No properties found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add properties to manage their photos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => (
            <motion.div
              key={property.id}
              whileHover={{ scale: 1.02 }}
              className={`glass-card overflow-hidden cursor-pointer transition-all ${
                selectedProperty?.id === property.id
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              onClick={() => setSelectedProperty(property)}
            >
              <div className="aspect-video relative bg-secondary/50">
                {property.primary_image_url ? (
                  <img
                    src={property.primary_image_url}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate">{property.title}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {property.location}
                </p>
                <p className="text-sm font-medium text-primary mt-1">
                  {property.price}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Image Manager Dialog */}
      <Dialog
        open={!!selectedProperty}
        onOpenChange={(open) => !open && setSelectedProperty(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Manage Photos - {selectedProperty?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-6">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  isDragOver
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">
                      Drag and drop images here, or
                    </p>
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <Button variant="outline" className="cursor-pointer" asChild>
                        <span>
                          <Plus className="w-4 h-4 mr-2" />
                          Browse Files
                        </span>
                      </Button>
                    </label>
                  </>
                )}
              </div>

              {/* Image Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <AnimatePresence>
                  {propertyImages.map((image) => (
                    <motion.div
                      key={image.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`relative group aspect-square rounded-lg overflow-hidden border-2 ${
                        image.is_primary ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img
                        src={image.image_url}
                        alt=""
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setPreviewImage(image.image_url)}
                      />

                      {/* Primary Badge */}
                      {image.is_primary && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Primary
                        </div>
                      )}

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {!image.is_primary && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleSetPrimary(image)}
                          >
                            <Star className="w-4 h-4 mr-1" />
                            Set Primary
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteImage(image)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {propertyImages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No photos yet</p>
                  <p className="text-sm">Upload images using the area above</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyPhotoManager;
