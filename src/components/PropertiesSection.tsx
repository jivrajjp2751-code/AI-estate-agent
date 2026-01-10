import { motion } from "framer-motion";
import { MapPin, Bed, Bath, Square, Heart, Eye, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import PropertyDetailModal from "./PropertyDetailModal";
import PropertyComparisonModal from "./PropertyComparisonModal";
import PropertyFiltersComponent, { PropertyFilters } from "./PropertyFilters";
import { toast } from "sonner";

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
  description?: string | null;
}

const PropertyCard = ({ 
  property, 
  index, 
  onViewDetails,
  isSelected,
  onToggleSelect
}: { 
  property: Property; 
  index: number;
  onViewDetails: (property: Property) => void;
  isSelected: boolean;
  onToggleSelect: (property: Property) => void;
}) => {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`glass-card-hover overflow-hidden group relative ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-4 left-4 z-10">
        <div 
          className="w-6 h-6 rounded bg-background/70 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-background/90 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(property);
          }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(property)}
            className="border-foreground/50"
          />
        </div>
      </div>

      {/* Image Container */}
      <div 
        className="relative h-64 overflow-hidden bg-secondary/50 cursor-pointer"
        onClick={() => onViewDetails(property)}
      >
        {property.primary_image_url ? (
          <img
            src={property.primary_image_url}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground">No image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        
        {/* Featured Badge */}
        {property.featured && (
          <div className="absolute top-4 right-14 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            Featured
          </div>
        )}

        {/* Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:bg-background/70"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isLiked ? "fill-primary text-primary" : "text-foreground"
            }`}
          />
        </button>

        {/* Price Tag */}
        <div className="absolute bottom-4 left-4">
          <span className="text-2xl font-bold gradient-text">{property.price}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 
          className="font-display text-xl font-semibold mb-2 group-hover:text-primary transition-colors cursor-pointer hover:underline"
          onClick={() => onViewDetails(property)}
        >
          {property.title}
        </h3>
        
        <div className="flex items-center text-muted-foreground mb-4">
          <MapPin className="w-4 h-4 mr-1 text-primary" />
          <span className="text-sm">{property.location}</span>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            <span>{property.beds} Beds</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            <span>{property.baths} Baths</span>
          </div>
          <div className="flex items-center gap-1">
            <Square className="w-4 h-4" />
            <span>{property.sqft} sqft</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => onViewDetails(property)}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </div>
    </motion.div>
  );
};

const PropertiesSection = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<Property[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [filters, setFilters] = useState<PropertyFilters>({
    search: "",
    priceMin: 0,
    priceMax: 50,
    bedsMin: 1,
    bedsMax: 10,
    sqftMin: 0,
    sqftMax: 10000,
    location: "all",
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (property: Property) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  const handleToggleSelect = (property: Property) => {
    setSelectedForComparison((prev) => {
      const isAlreadySelected = prev.some((p) => p.id === property.id);
      if (isAlreadySelected) {
        return prev.filter((p) => p.id !== property.id);
      }
      if (prev.length >= 4) {
        toast.warning("You can compare up to 4 properties at a time");
        return prev;
      }
      return [...prev, property];
    });
  };

  const handleRemoveFromComparison = (id: string) => {
    setSelectedForComparison((prev) => prev.filter((p) => p.id !== id));
  };

  // Extract unique locations for filter
  const locations = useMemo(() => {
    const locs = new Set<string>();
    properties.forEach((p) => {
      // Extract city name from location
      const parts = p.location.split(",");
      if (parts.length > 1) {
        locs.add(parts[parts.length - 1].trim());
      } else {
        locs.add(p.location);
      }
    });
    return Array.from(locs).sort();
  }, [properties]);

  // Filter properties
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !p.title.toLowerCase().includes(searchLower) &&
          !p.location.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Price filter (parse price like "₹12.5 Cr" to number)
      const priceMatch = p.price.match(/[\d.]+/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[0]);
        if (price < filters.priceMin || price > filters.priceMax) {
          return false;
        }
      }

      // Beds filter
      if (p.beds < filters.bedsMin || p.beds > filters.bedsMax) {
        return false;
      }

      // Sqft filter
      const sqftNum = parseInt(p.sqft.replace(/,/g, ''));
      if (sqftNum < filters.sqftMin || sqftNum > filters.sqftMax) {
        return false;
      }

      // Location filter
      if (filters.location !== "all") {
        if (!p.location.toLowerCase().includes(filters.location.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [properties, filters]);

  return (
    <>
      <section id="properties" className="py-24 bg-secondary/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Featured <span className="gradient-text">Properties</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Explore our handpicked selection of premium properties in your preferred area
            </p>
          </motion.div>

          {/* Filters */}
          <PropertyFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            locations={locations}
          />

          {/* Comparison Bar */}
          {selectedForComparison.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 mb-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <GitCompare className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  {selectedForComparison.length} properties selected for comparison
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedForComparison([])}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsComparisonOpen(true)}
                  disabled={selectedForComparison.length < 2}
                >
                  Compare Now
                </Button>
              </div>
            </motion.div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No properties found matching your criteria</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setFilters({
                  search: "",
                  priceMin: 0,
                  priceMax: 50,
                  bedsMin: 1,
                  bedsMax: 10,
                  sqftMin: 0,
                  sqftMax: 10000,
                  location: "all",
                })}
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Showing {filteredProperties.length} of {properties.length} properties
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {filteredProperties.map((property, index) => (
                  <PropertyCard 
                    key={property.id} 
                    property={property} 
                    index={index}
                    onViewDetails={handleViewDetails}
                    isSelected={selectedForComparison.some((p) => p.id === property.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <PropertyDetailModal
        property={selectedProperty}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <PropertyComparisonModal
        properties={selectedForComparison}
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        onRemoveProperty={handleRemoveFromComparison}
      />
    </>
  );
};

export default PropertiesSection;
