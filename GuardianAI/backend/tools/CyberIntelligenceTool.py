import os
import hashlib
import requests
import pyshark

class CyberIntelligenceTool:
    def __init__(self):
        self.sandbox_url = "https://sandbox.example.com/api/submit"
        self.ipvoid_api_url = "https://api.ipvoid.com/v1/"

    def analyze_malware(self, file_path):
        # Calculate hash of malware sample
        hash = hashlib.sha256(open(file_path, 'rb').read()).hexdigest()
        # Submit sample to sandbox for analysis
        response = requests.post(self.sandbox_url, files={'file': open(file_path, 'rb')})
        # Get analysis results
        results_url = "https://sandbox.example.com/api/results/" + hash
        response = requests.get(results_url)
        return response.json()

    def check_ip_reputation(self, ip_address):
        # Use IPVoid API to check IP reputation
        response = requests.get(self.ipvoid_api_url + ip_address)
        return response.json()

    def analyze_network_traffic(self, pcap_file):
        # Use PyShark to analyze network traffic
        capture = pyshark.FileCapture(pcap_file)
        packets = []
        for packet in capture:
            packets.append(str(packet))
        return packets

def main():
    tool = CyberIntelligenceTool()
    while True:
        print("Cyber Intelligence Tool")
        print("1. Analyze Malware")
        print("2. Check IP Reputation")
        print("3. Analyze Network Traffic")
        print("4. Quit")
        choice = input("Choose an option: ")
        if choice == "1":
            file_path = input("Enter malware file path: ")
            results = tool.analyze_malware(file_path)
            print(results)
        elif choice == "2":
            ip_address = input("Enter IP address: ")
            results = tool.check_ip_reputation(ip_address)
            print(results)
        elif choice == "3":
            pcap_file = input("Enter pcap file path: ")
            packets = tool.analyze_network_traffic(pcap_file)
            for packet in packets:
                print(packet)
        elif choice == "4":
            break
        else:
            print("Invalid choice. Please choose a valid option.")

if __name__ == "__main__":
    main()
