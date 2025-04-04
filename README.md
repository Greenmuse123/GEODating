# Nearby Dating App

A modern dating application that helps users find potential matches based on location and preferences. The app features real-time location updates, user profiles, and an intuitive chat system that unlocks when users match.

## Features

- Location-based matching system
- Real-time location updates (with privacy controls)
- User profiles with verification options
- Interactive map interface
- Secure chat system
- Privacy-focused design
- Smooth animations and modern UI

## Prerequisites

- Node.js (v14 or later)
- React Native development environment
- Firebase account and project
- Mapbox API key

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nearby-dating-app.git
   cd nearby-dating-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Enable Cloud Firestore
   - Enable Storage
   - Add your Firebase configuration to `src/config/firebase.js`

4. Set up Mapbox:
   - Create a Mapbox account at [Mapbox](https://www.mapbox.com)
   - Get your access token
   - Add your Mapbox token to `src/config/mapbox.js`

5. Run the app:
   ```bash
   # For iOS
   npm run ios
   
   # For Android
   npm run android
   ```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── navigation/     # Navigation configuration
├── services/       # API and service functions
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── config/         # Configuration files
└── assets/         # Images, fonts, etc.
```

## Key Components

### MapScreen
- Displays an interactive map with potential matches
- Real-time location updates
- Privacy controls for location sharing
- User markers with basic information

### ProfileScreen
- User profile information
- Profile picture upload
- Interests and preferences
- Privacy settings

### ChatListScreen
- List of matches and conversations
- Real-time message updates
- Distance information
- Online status indicators

### SettingsScreen
- App preferences
- Privacy controls
- Account settings
- Support options

## Custom Hooks

### useLocation
- Handles location updates
- Manages location permissions
- Calculates distances
- Updates user location in Firebase

### useAuth
- Manages user authentication
- Handles user profile
- Manages profile updates
- Handles image uploads

### useChat
- Manages chat conversations
- Real-time message updates
- Message history
- Read receipts

### useMatching
- Handles user matching
- Manages likes and dislikes
- Filters potential matches
- Updates match status

## Safety Features

- Location sharing toggle
- User verification system
- Report and block functionality
- Privacy controls for location sharing
- Secure chat system

## Testing

The app includes sample user accounts for testing purposes. These accounts are pre-populated with fake data to demonstrate the app's functionality.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Firebase for backend services
- Mapbox for mapping functionality
- React Native community for excellent tools and libraries #   G E O D a t i n g  
 