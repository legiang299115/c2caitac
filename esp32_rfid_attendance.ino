#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>

// Thay đổi thông tin WiFi của bạn
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Điền địa chỉ API điểm danh của server
// LƯU Ý: Phải là địa chỉ HTTPS / HTTP trỏ về server Node.js đang chạy
const char* serverUrl = "https://YOUR_APP_DOMAIN/api/attendance/swipe"; 

#define RST_PIN 22
#define SS_PIN 21

MFRC522 mfrc522(SS_PIN, RST_PIN);
String macAddress = "";
WiFiClientSecure client;

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();
  
  // Kết nối WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi!");
  
  // Bỏ qua kiểm tra chứng chỉ SSL/TLS nếu dùng HTTPS
  client.setInsecure();
  
  // Lấy địa chỉ MAC của ESP32 (dùng để định danh máy với lớp)
  macAddress = WiFi.macAddress();
  Serial.println("Device MAC Address: " + macAddress);
  Serial.println("Vui lòng khai báo MAC Address này vào hệ thống Admin (Mục Học sinh -> Thiết bị điểm danh).");
}

void loop() {
  // Kiểm tra có thẻ mới
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }

  // Đọc mã UID của thẻ RFID
  String rfidUid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    rfidUid += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    rfidUid += String(mfrc522.uid.uidByte[i], HEX);
  }
  rfidUid.toUpperCase();
  Serial.println("Card swiped: " + rfidUid);

  // Gửi API lên Server
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    // Sử dụng WiFiClientSecure cho HTTPS
    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Body truyền lên gồm uid thẻ và macAddress của thiết bị
    String jsonPayload = "{\"uid\":\"" + rfidUid + "\",\"macAddress\":\"" + macAddress + "\"}";
    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("HTTP Response Code: ");
      Serial.println(httpResponseCode);
      Serial.print("Server Reply: ");
      Serial.println(response);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("Error: WiFi not connected");
  }
  
  mfrc522.PICC_HaltA();
  delay(2000); // Tránh đọc nhiều lần trong 1 lần quẹt
}
