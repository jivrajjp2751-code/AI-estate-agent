import { motion } from "framer-motion";
import { MapPin, Bed, Bath, Square, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import property4 from "@/assets/property-4.jpg";
import property5 from "@/assets/property-5.jpg";
import property6 from "@/assets/property-6.jpg";

const properties = [
  {
    id: 1,
    title: "Modern Villa with Pool",
    location: "Beverly Hills, CA",
    price: "$2,850,000",
    beds: 5,
    baths: 4,
    sqft: "4,200",
    image: property1,
    featured: true,
  },
  {
    id: 2,
    title: "Luxury Penthouse",
    location: "Manhattan, NY",
    price: "$4,500,000",
    beds: 3,
    baths: 3,
    sqft: "3,100",
    image: property2,
    featured: false,
  },
  {
    id: 3,
    title: "Beachfront Mansion",
    location: "Miami Beach, FL",
    price: "$6,200,000",
    beds: 6,
    baths: 5,
    sqft: "5,800",
    image: property3,
    featured: true,
  },
  {
    id: 4,
    title: "Contemporary Townhouse",
    location: "Scottsdale, AZ",
    price: "$1,450,000",
    beds: 4,
    baths: 3,
    sqft: "2,800",
    image: property4,
    featured: false,
  },
  {
    id: 5,
    title: "Industrial Loft",
    location: "Brooklyn, NY",
    price: "$1,850,000",
    beds: 2,
    baths: 2,
    sqft: "2,100",
    image: property5,
    featured: false,
  },
  {
    id: 6,
    title: "Mountain Retreat",
    location: "Aspen, CO",
    price: "$3,900,000",
    beds: 5,
    baths: 4,
    sqft: "4,500",
    image: property6,
    featured: true,
  },
];

const areas = ["All Areas", "Beverly Hills", "Manhattan", "Miami Beach", "Scottsdale", "Brooklyn", "Aspen"];

const PropertyCard = ({ property, index }: { property: typeof properties[0]; index: number }) => {
  const [isLiked, setIsLiked] = useState(false);

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="glass-card-hover overflow-hidden group"
    >
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={property.image}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        
        {/* Featured Badge */}
        {property.featured && (
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            Featured
          </div>
        )}

        {/* Like Button */}
        <button
          onClick={() => setIsLiked(!isLiked)}
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
        <h3 className="font-display text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
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

        <Button variant="outline" className="w-full" onClick={scrollToContact}>
          Request Info
        </Button>
      </div>
    </motion.div>
  );
};

const PropertiesSection = () => {
  const [selectedArea, setSelectedArea] = useState("All Areas");

  const filteredProperties = selectedArea === "All Areas"
    ? properties
    : properties.filter((p) => p.location.includes(selectedArea));

  return (
    <section id="properties" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Featured <span className="gradient-text">Properties</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Explore our handpicked selection of premium properties in your preferred area
          </p>

          {/* Area Filter */}
          <div className="flex flex-wrap justify-center gap-2">
            {areas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedArea === area
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredProperties.map((property, index) => (
            <PropertyCard key={property.id} property={property} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PropertiesSection;
