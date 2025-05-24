import requests
import json

# --- Configuration ---
# Microsoft Sentinel Configuration
sentinel_workspace_id = "YOUR_SENTINEL_WORKSPACE_ID_HERE"
sentinel_workspace_key = "YOUR_SENTINEL_WORKSPACE_KEY_HERE" # Note: Review Azure documentation for correct auth header format.
sentinel_api_url = f"https://{sentinel_workspace_id}.ods.opinsights.azure.com/api/logs?api-version=2016-04-01"
sentinel_log_type = "MerakiSecurityEvents" # Custom log type name for Sentinel

# Cisco Meraki Configuration
meraki_api_key = "YOUR_MERAKI_API_KEY_HERE"
meraki_org_id = "YOUR_MERAKI_ORG_ID_HERE"
meraki_api_url = f"https://api.meraki.com/api/v1/organizations/{meraki_org_id}/appliance/security/events"

# SAPS Intelligence Operations Configuration
saps_intel_api_url = "YOUR_SAPS_INTEL_API_URL_HERE" # e.g., "https://sapsintel.example.gov.za/api/events"
saps_intel_api_key = "YOUR_SAPS_INTEL_API_KEY_HERE"

# --- Functions ---
def get_meraki_security_events():
    """Fetches security events from the Cisco Meraki API."""
    headers = {
        "X-Cisco-Meraki-API-Key": meraki_api_key,
        "Accept": "application/json"
    }
    try:
        response = requests.get(meraki_api_url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Meraki security events: {e}")
        return None

def send_to_sentinel(events, log_type):
    """Sends events data to Microsoft Sentinel."""
    headers = {
        "Authorization": f"SharedKey {sentinel_workspace_id}:{sentinel_workspace_key}",
        "Content-Type": "application/json",
        "Log-Type": log_type
    }
    body = json.dumps(events)
    try:
        response = requests.post(sentinel_api_url, headers=headers, data=body, timeout=30)
        response.raise_for_status()
        return response.status_code
    except requests.exceptions.RequestException as e:
        print(f"Error sending data to Sentinel: {e}")
        return None

def integrate_with_saps_intel(events):
    """Integrates (sends) events data with the SAPS Intelligence Operations API."""
    headers = {
        "Authorization": f"Bearer {saps_intel_api_key}",
        "Content-Type": "application/json"
    }
    body = json.dumps(events)
    try:
        response = requests.post(saps_intel_api_url, headers=headers, data=body, timeout=30)
        response.raise_for_status()
        return response.status_code
    except requests.exceptions.RequestException as e:
        print(f"Error integrating with SAPS Intel API: {e}")
        return None

def main():
    """Main function to fetch events and send them to configured endpoints."""
    print("Attempting to fetch Meraki security events...")
    meraki_events = get_meraki_security_events()

    if meraki_events:
        if isinstance(meraki_events, list) and meraki_events:
            print(f"Successfully fetched {len(meraki_events)} Meraki event(s).")
        elif isinstance(meraki_events, dict):
            print(f"Fetched Meraki data (possibly a single event or info): {meraki_events}")
            meraki_events = [meraki_events]
        else:
            print(f"Fetched Meraki data, but it's not in list format: {meraki_events}")
            return

        print("Attempting to send events to Microsoft Sentinel...")
        sentinel_response_status = send_to_sentinel(meraki_events, sentinel_log_type)
        if sentinel_response_status:
            print(f"Microsoft Sentinel response status: {sentinel_response_status}")
        else:
            print("Failed to send events to Microsoft Sentinel or error occurred.")

        print("Attempting to integrate events with SAPS Intelligence Operations...")
        saps_intel_response_status = integrate_with_saps_intel(meraki_events)
        if saps_intel_response_status:
            print(f"SAPS Intel integration response status: {saps_intel_response_status}")
        else:
            print("Failed to integrate events with SAPS Intel or error occurred.")
    else:
        print("No Meraki security events fetched or an error occurred during fetching.")

if __name__ == "__main__":
    main()
