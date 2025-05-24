import os
import hashlib
import requests
import pyshark # Note: pyshark is a dependency and requires tshark to be installed.

class CyberIntelligenceTool:
    def __init__(self):
        # Configuration for external services - Replace with actual URLs or make configurable
        self.sandbox_url = "YOUR_SANDBOX_API_SUBMIT_URL_HERE"  # e.g., "https://sandbox.example.com/api/submit"
        self.sandbox_results_url_template = "YOUR_SANDBOX_API_RESULTS_URL_TEMPLATE_HERE" # e.g., "https://sandbox.example.com/api/results/{hash}"
        self.ipvoid_api_url = "https://api.ipvoid.com/stats.php?key=YOUR_IPVOID_API_KEY_HERE&ip=" # Example, replace with actual API structure

    def analyze_malware(self, file_path):
        """Analyzes a malware sample by calculating its hash and submitting it to a sandbox."""
        if not os.path.exists(file_path):
            print(f"Error: File not found at {file_path}")
            return None
        try:
            with open(file_path, 'rb') as f:
                file_content = f.read()
            malware_hash = hashlib.sha256(file_content).hexdigest()
            print(f"Calculated SHA256 hash: {malware_hash}")

            # Submit sample to sandbox for analysis
            if not self.sandbox_url or 'YOUR_SANDBOX_API_SUBMIT_URL_HERE' in self.sandbox_url:
                print("Error: Sandbox URL is not configured. Please set self.sandbox_url.")
                return None

            files = {'file': (os.path.basename(file_path), file_content)}
            response = requests.post(self.sandbox_url, files=files, timeout=60)
            response.raise_for_status() # Raise an exception for bad status codes
            print(f"Sandbox submission response: {response.status_code}")

            # Get analysis results (This part is highly dependent on the sandbox API)
            if not self.sandbox_results_url_template or 'YOUR_SANDBOX_API_RESULTS_URL_TEMPLATE_HERE' in self.sandbox_results_url_template:
                print("Error: Sandbox results URL template is not configured.")
                return {'submission_status': response.status_code, 'details': 'Results URL not configured.'}

            results_url = self.sandbox_results_url_template.format(hash=malware_hash)
            print(f"Fetching results from: {results_url}")
            # It might take time for results to be available; this is a simplified synchronous request.
            # A real implementation might need polling or a callback mechanism.
            analysis_response = requests.get(results_url, timeout=60)
            analysis_response.raise_for_status()
            return analysis_response.json()
        except FileNotFoundError:
            print(f"Error: Malware sample file not found at {file_path}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Error during malware analysis API call: {e}")
            return None
        except Exception as e:
            print(f"An unexpected error occurred during malware analysis: {e}")
            return None

    def check_ip_reputation(self, ip_address):
        """Checks the reputation of an IP address using the IPVoid API (example)."""
        if not self.ipvoid_api_url or 'YOUR_IPVOID_API_KEY_HERE' in self.ipvoid_api_url:
            print("Error: IPVoid API URL or key is not configured.")
            return None
        try:
            api_url = f"{self.ipvoid_api_url}{ip_address}" # Assumes API key is part of the URL
            print(f"Querying IPVoid API: {api_url}")
            response = requests.get(api_url, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error during IP reputation check: {e}")
            return None
        except Exception as e:
            print(f"An unexpected error occurred during IP reputation check: {e}")
            return None

    def analyze_network_traffic(self, pcap_file_path):
        """Analyzes network traffic from a PCAP file using PyShark."""
        if not os.path.exists(pcap_file_path):
            print(f"Error: PCAP file not found at {pcap_file_path}")
            return []
        packets_summary = []
        try:
            # Ensure tshark is in PATH or pyshark.FileCapture is configured with tshark_path
            capture = pyshark.FileCapture(pcap_file_path)
            for packet_count, packet in enumerate(capture):
                # Basic packet summary, can be expanded based on needs
                summary = f"Packet #{packet_count + 1}: {packet.number} {packet.sniff_time} {packet.highest_layer} {packet.length}"
                if 'IP' in packet:
                    summary += f" {packet.ip.src} -> {packet.ip.dst}"
                packets_summary.append(summary)
                if packet_count < 5: # Print summary of first 5 packets
                    print(summary)
            capture.close()
            print(f"Analyzed {len(packets_summary)} packets.")
        except Exception as e:
            # PyShark can raise various exceptions, including if tshark is not found.
            print(f"Error during network traffic analysis: {e}")
            print("Ensure tshark is installed and in your system's PATH.")
        return packets_summary

def main():
    tool = CyberIntelligenceTool()
    while True:
        print("\nCyber Intelligence Tool Menu:")
        print("1. Analyze Malware (requires sandbox setup)")
        print("2. Check IP Reputation (requires IPVoid API key)")
        print("3. Analyze Network Traffic (requires pcap file & tshark)")
        print("4. Quit")
        choice = input("Choose an option: ")

        if choice == "1":
            file_path = input("Enter malware sample file path: ")
            if tool.sandbox_url == 'YOUR_SANDBOX_API_SUBMIT_URL_HERE' or tool.sandbox_results_url_template == 'YOUR_SANDBOX_API_RESULTS_URL_TEMPLATE_HERE':
                print("Warning: Sandbox URLs are not configured in the script. Analysis might fail or use defaults.")
            results = tool.analyze_malware(file_path)
            print("Analysis Results:")
            print(results if results else 'No results or error.')
        elif choice == "2":
            ip_address = input("Enter IP address: ")
            if 'YOUR_IPVOID_API_KEY_HERE' in tool.ipvoid_api_url:
                print("Warning: IPVoid API key is not configured. Check will likely fail.")
            results = tool.check_ip_reputation(ip_address)
            print("IP Reputation Results:")
            print(results if results else 'No results or error.')
        elif choice == "3":
            pcap_file = input("Enter PCAP file path: ")
            packets = tool.analyze_network_traffic(pcap_file)
            print(f"Network Analysis Summary - {len(packets)} packets processed.")
            # for packet_summary in packets: # Potentially very verbose
            #     print(packet_summary)
        elif choice == "4":
            print("Exiting Cyber Intelligence Tool.")
            break
        else:
            print("Invalid choice. Please choose a valid option.")

if __name__ == "__main__":
    main()
