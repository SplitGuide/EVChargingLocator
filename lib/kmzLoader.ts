import JSZip from 'jszip';

export interface KmlFeature {
  type: 'marker' | 'polyline' | 'polygon';
  coordinates: google.maps.LatLngLiteral[] | google.maps.LatLngLiteral;
  name?: string;
  description?: string;
  style?: {
    icon?: string;
    strokeColor?: string;
    strokeWeight?: number;
    fillColor?: string;
  };
}

/**
 * Loads and parses a KMZ file
 * @param file The KMZ file to load
 * @returns A promise that resolves to an array of KmlFeature objects
 */
export async function loadKmzFile(file: File): Promise<KmlFeature[]> {
  try {
    // Read the KMZ file as ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // Use JSZip to extract KML from KMZ (which is a zip file)
    const zip = new JSZip();
    const contents = await zip.loadAsync(buffer);
    
    // Find the KML file (usually doc.kml)
    let kmlFile = contents.file(/\.kml$/i)[0];
    if (!kmlFile) {
      throw new Error("No KML file found in the KMZ archive");
    }
    
    // Extract the KML content
    const kmlContent = await kmlFile.async("string");
    
    // Parse the KML
    return parseKml(kmlContent);
  } catch (error) {
    console.error("Error loading KMZ file:", error);
    throw error;
  }
}

/**
 * Parse KML string into GeoJSON-like features
 * @param kmlString The KML content as string
 * @returns Array of parsed features
 */
function parseKml(kmlString: string): KmlFeature[] {
  const features: KmlFeature[] = [];
  const parser = new DOMParser();
  const kmlDoc = parser.parseFromString(kmlString, "text/xml");
  
  // Parse placemarks
  const placemarks = kmlDoc.getElementsByTagName("Placemark");
  
  for (let i = 0; i < placemarks.length; i++) {
    const placemark = placemarks[i];
    const name = placemark.getElementsByTagName("name")[0]?.textContent || "";
    const description = placemark.getElementsByTagName("description")[0]?.textContent || "";
    
    // Check for point (marker)
    const point = placemark.getElementsByTagName("Point")[0];
    if (point) {
      const coordinates = point.getElementsByTagName("coordinates")[0]?.textContent || "";
      const [lng, lat] = coordinates.trim().split(",").map(Number);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        features.push({
          type: "marker",
          coordinates: { lat, lng },
          name,
          description
        });
      }
      continue;
    }
    
    // Check for LineString (polyline)
    const lineString = placemark.getElementsByTagName("LineString")[0];
    if (lineString) {
      const coordsString = lineString.getElementsByTagName("coordinates")[0]?.textContent || "";
      const coords = parseCoordinatesString(coordsString);
      
      if (coords.length > 0) {
        features.push({
          type: "polyline",
          coordinates: coords,
          name,
          description,
          style: parseStyle(placemark)
        });
      }
      continue;
    }
    
    // Check for Polygon
    const polygon = placemark.getElementsByTagName("Polygon")[0];
    if (polygon) {
      const outerBoundary = polygon.getElementsByTagName("outerBoundaryIs")[0];
      if (outerBoundary) {
        const ring = outerBoundary.getElementsByTagName("LinearRing")[0];
        if (ring) {
          const coordsString = ring.getElementsByTagName("coordinates")[0]?.textContent || "";
          const coords = parseCoordinatesString(coordsString);
          
          if (coords.length > 0) {
            features.push({
              type: "polygon",
              coordinates: coords,
              name,
              description,
              style: parseStyle(placemark)
            });
          }
        }
      }
    }
  }
  
  return features;
}

/**
 * Parse KML coordinates string into array of LatLngLiteral
 */
function parseCoordinatesString(coordsString: string): google.maps.LatLngLiteral[] {
  const coordinates: google.maps.LatLngLiteral[] = [];
  
  const points = coordsString.trim().split(/\s+/);
  for (const point of points) {
    const [lng, lat] = point.split(",").map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      coordinates.push({ lat, lng });
    }
  }
  
  return coordinates;
}

/**
 * Extract style information from a Placemark
 */
function parseStyle(placemark: Element): KmlFeature['style'] {
  const style: KmlFeature['style'] = {};
  
  // Get style URL reference
  const styleUrl = placemark.getElementsByTagName("styleUrl")[0]?.textContent;
  if (styleUrl) {
    // Usually in format "#styleId" - remove the #
    const styleId = styleUrl.replace('#', '');
    // We'd need to look up the style in the document styles
    // This is simplified and would need more work for a complete implementation
  }
  
  // Direct style element
  const styleElement = placemark.getElementsByTagName("Style")[0];
  if (styleElement) {
    // Line style
    const lineStyle = styleElement.getElementsByTagName("LineStyle")[0];
    if (lineStyle) {
      const color = lineStyle.getElementsByTagName("color")[0]?.textContent;
      const width = lineStyle.getElementsByTagName("width")[0]?.textContent;
      
      if (color) {
        // KML color format is aabbggrr (alpha, blue, green, red)
        // Convert to CSS #rrggbb
        if (color.length === 8) {
          const a = color.substring(0, 2);
          const b = color.substring(2, 4);
          const g = color.substring(4, 6);
          const r = color.substring(6, 8);
          style.strokeColor = `#${r}${g}${b}`;
        }
      }
      
      if (width) {
        style.strokeWeight = parseFloat(width);
      }
    }
    
    // Fill style
    const polyStyle = styleElement.getElementsByTagName("PolyStyle")[0];
    if (polyStyle) {
      const color = polyStyle.getElementsByTagName("color")[0]?.textContent;
      
      if (color) {
        // KML color format is aabbggrr
        if (color.length === 8) {
          const a = color.substring(0, 2);
          const b = color.substring(2, 4);
          const g = color.substring(4, 6);
          const r = color.substring(6, 8);
          style.fillColor = `#${r}${g}${b}`;
        }
      }
    }
    
    // Icon style
    const iconStyle = styleElement.getElementsByTagName("IconStyle")[0];
    if (iconStyle) {
      const icon = iconStyle.getElementsByTagName("Icon")[0];
      if (icon) {
        const href = icon.getElementsByTagName("href")[0]?.textContent;
        if (href) {
          style.icon = href;
        }
      }
    }
  }
  
  return style;
}