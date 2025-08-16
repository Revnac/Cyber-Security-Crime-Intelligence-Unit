#!/usr/bin/env python3
import os
import subprocess
import argparse
import logging
import sys
from datetime import datetime

# Setup basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

EVIDENCE_DIR = "/mnt/forensics/evidence"

def check_root():
    """Check if the script is running as root."""
    if os.geteuid() != 0:
        logging.error("This script must be run as root to access block devices.")
        sys.exit(1)

def image_drive(device, case_number):
    """
    Creates a forensic image of a drive using guymager.
    """
    if not os.path.exists(device):
        logging.error(f"Device {device} not found.")
        return

    output_dir = os.path.join(EVIDENCE_DIR, case_number)
    os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    image_name = f"image_{os.path.basename(device)}_{timestamp}.img"
    output_path = os.path.join(output_dir, image_name)
    log_path = os.path.join(output_dir, f"guymager_log_{timestamp}.log")

    logging.info(f"Starting imaging for device: {device}")
    logging.info(f"Case Number: {case_number}")
    logging.info(f"Output image: {output_path}")
    logging.info(f"Log file: {log_path}")

    # Note: Guymager is a GUI tool. For command-line automation, 'dd' or 'dcfldd' are more common.
    # This command is a placeholder for how one might call it.
    # You may need to adapt this based on your specific version and configuration of guymager.
    command = [
        "guymager",
        f"--source={device}",
        f"--destination={output_path}",
        f"--logfile={log_path}",
        "--hash=SHA256",
        "--verify=After",
        "--compress=None", # No compression for raw image
        "--eot" # Exit on task completion
    ]

    try:
        # Using a placeholder command as guymager is interactive.
        # In a real scenario, dcfldd would be a better choice for scripting.
        logging.info("Simulating guymager command. In a real environment, you would run:")
        logging.info(f"sudo {' '.join(command)}")
        logging.warning("This is a simulation. No actual imaging will be performed by this script.")
        # For a real implementation, you would uncomment the following line:
        # subprocess.run(command, check=True)
        # logging.info(f"Imaging complete for {device}. See log at {log_path}")
    except FileNotFoundError:
        logging.error("guymager not found. Please ensure it is installed and in your PATH.")
    except subprocess.CalledProcessError as e:
        logging.error(f"An error occurred during imaging: {e}")

def main():
    """Main function to parse arguments and start imaging."""
    check_root()

    parser = argparse.ArgumentParser(description="Forensic Drive Imaging Script")
    parser.add_argument("-d", "--device", required=True, help="The device to image (e.g., /dev/sdb)")
    parser.add_argument("-c", "--case", required=True, help="The case number for organizing evidence.")

    args = parser.parse_args()

    # The original script created the evidence dir here, but it's better handled by Ansible.
    # os.makedirs(EVIDENCE_DIR, exist_ok=True)

    image_drive(args.device, args.case)

if __name__ == "__main__":
    main()
