#include <WiFi.h>

const char* WIFI_SSID     = "ceres";
const char* WIFI_PASSWORD = "12345678";

void setup() {
  Serial.begin(115200);
  delay(1000);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Connected! ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Print every 5s so it's easy to spot in the Serial Monitor
  Serial.println(WiFi.localIP());
  delay(5000);
}
