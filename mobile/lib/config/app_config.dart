class AppConfig {
  // Backend API base URL — update for production
  // static const String apiBaseUrl = 'http://10.0.2.2:8000'; // Android emulator → host localhost
  // static const String apiBaseUrl = 'http://localhost:8000'; // iOS simulator
  static const String apiBaseUrl = 'http://172.20.10.5:8000'; // physical device via hotspot

  // ImageKit configuration
  static const String imagekitPublicKey = 'public_Kto9TlcMV+9ep5+d65JCb0yq9Ko=';
  static const String imagekitPrivateKey = 'private_EvS4dGJx48Ft3CjWclfAAdT/KgI=';
  static const String imagekitUrlEndpoint = 'https://ik.imagekit.io/x2uo7omcw';
  static const String imagekitUploadUrl = 'https://upload.imagekit.io/api/v1/files/upload';

  // Chandra OCR API
  static const String chandraOcrUrl = 'https://www.datalab.to/api/v1/convert';
  static const String chandraOcrApiKey = 'Amp3EQbz3GakyNV1ChY_p_GbB5fv3J38pnNO3YozWJY';

  // Ceres brand colour
  static const int primaryColor = 0xFF1D4ED8;

  // Secure storage keys
  static const String accessTokenKey = 'ceres_access_token';
  static const String refreshTokenKey = 'ceres_refresh_token';
}
