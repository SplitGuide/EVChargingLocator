// Voice Command Parser
// This module handles parsing voice commands and determining the intent

export type VoiceCommandIntent = {
  action: 'search' | 'navigate' | 'filter' | 'unknown';
  target?: string;
  params?: Record<string, any>;
};

export class VoiceCommandParser {
  // Keywords to detect for each command type
  private searchKeywords = ['find', 'search', 'look for', 'show', 'display'];
  private navigateKeywords = ['navigate', 'directions', 'go to', 'take me to', 'route to'];
  private filterKeywords = ['filter', 'only show', 'limit to'];
  
  // Keywords for charging stations
  private stationKeywords = ['station', 'stations', 'charging', 'charger', 'chargers', 'ev'];
  
  // Keywords for amenities
  private amenityKeywords = {
    restaurants: ['restaurant', 'food', 'eat', 'dining'],
    hotels: ['hotel', 'motel', 'stay', 'accommodation', 'lodge', 'lodging'],
    restrooms: ['restroom', 'toilet', 'bathroom', 'washroom']
  };
  
  // Keywords for locations
  private locationKeywords = ['near', 'around', 'close to', 'nearby', 'in'];
  
  // Parse the voice command to determine the intent
  public parseCommand(command: string): VoiceCommandIntent {
    // Convert to lowercase for easier matching
    const lowerCommand = command.toLowerCase();
    
    // Check for search commands
    if (this.containsAny(lowerCommand, this.searchKeywords)) {
      return this.parseSearchCommand(lowerCommand);
    }
    
    // Check for navigation commands
    if (this.containsAny(lowerCommand, this.navigateKeywords)) {
      return this.parseNavigateCommand(lowerCommand);
    }
    
    // Check for filter commands
    if (this.containsAny(lowerCommand, this.filterKeywords)) {
      return this.parseFilterCommand(lowerCommand);
    }
    
    // If no specific command is recognized, check if it might be a search query
    if (this.containsAny(lowerCommand, this.stationKeywords)) {
      return this.parseSearchCommand(lowerCommand);
    }
    
    // Default to unknown intent
    return {
      action: 'unknown',
      target: command
    };
  }
  
  // Parse search commands like "find charging stations near me"
  private parseSearchCommand(command: string): VoiceCommandIntent {
    const params: Record<string, any> = {};
    
    // Check for station keywords
    if (this.containsAny(command, this.stationKeywords)) {
      params.type = 'station';
    }
    
    // Check for amenities
    if (this.containsAny(command, this.amenityKeywords.restaurants)) {
      params.amenities = params.amenities || [];
      params.amenities.push('restaurants');
    }
    
    if (this.containsAny(command, this.amenityKeywords.hotels)) {
      params.amenities = params.amenities || [];
      params.amenities.push('hotels');
    }
    
    if (this.containsAny(command, this.amenityKeywords.restrooms)) {
      params.amenities = params.amenities || [];
      params.amenities.push('restrooms');
    }
    
    // Check for location references
    if (command.includes('near me') || command.includes('around me')) {
      params.location = 'user';
    } else {
      // Try to extract a location name
      const locationPattern = new RegExp(`(${this.locationKeywords.join('|')})\\s+([\\w\\s]+)`, 'i');
      const match = command.match(locationPattern);
      
      if (match && match[2]) {
        params.location = match[2].trim();
      }
    }
    
    return {
      action: 'search',
      target: 'station',
      params
    };
  }
  
  // Parse navigation commands like "navigate to nearest charging station"
  private parseNavigateCommand(command: string): VoiceCommandIntent {
    const params: Record<string, any> = {};
    
    // Check if navigating to a station
    if (this.containsAny(command, this.stationKeywords)) {
      params.type = 'station';
      
      // Check for nearest/closest
      if (command.includes('nearest') || command.includes('closest')) {
        params.nearest = true;
      }
    }
    
    // Check for specific station mention (e.g., "navigate to Tata Power station")
    const stationNamePattern = /to\s+([A-Za-z\s]+)\s+(station|charger)/i;
    const match = command.match(stationNamePattern);
    
    if (match && match[1]) {
      params.stationName = match[1].trim();
    }
    
    return {
      action: 'navigate',
      target: 'station',
      params
    };
  }
  
  // Parse filter commands like "filter stations with restaurants"
  private parseFilterCommand(command: string): VoiceCommandIntent {
    const params: Record<string, any> = {
      filters: []
    };
    
    // Check for amenities to filter by
    if (this.containsAny(command, this.amenityKeywords.restaurants)) {
      params.filters.push('restaurants');
    }
    
    if (this.containsAny(command, this.amenityKeywords.hotels)) {
      params.filters.push('hotels');
    }
    
    if (this.containsAny(command, this.amenityKeywords.restrooms)) {
      params.filters.push('restrooms');
    }
    
    return {
      action: 'filter',
      target: 'station',
      params
    };
  }
  
  // Helper method to check if any keyword is in the command
  private containsAny(command: string, keywords: string[]): boolean {
    return keywords.some(keyword => command.includes(keyword));
  }
}

// Create and export a singleton instance
const voiceCommandParser = new VoiceCommandParser();
export default voiceCommandParser;