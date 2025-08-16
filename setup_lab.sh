#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print a formatted header
print_header() {
    echo -e "${YELLOW}=====================================================${NC}"
    echo -e "${YELLOW} $1 ${NC}"
    echo -e "${YELLOW}=====================================================${NC}"
}

# Function to run Terraform
deploy_infrastructure() {
    print_header "Deploying Infrastructure with Terraform"
    if [ ! -d "terraform" ]; then
        echo -e "${RED}Terraform directory not found! Are you in the project root?${NC}"
        return
    fi
    cd terraform

    echo "Initializing Terraform..."
    terraform init

    echo "Planning Terraform deployment..."
    terraform plan

    read -p "Do you want to apply this plan? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Applying Terraform plan..."
        terraform apply -auto-approve
    else
        echo -e "${YELLOW}Terraform apply cancelled.${NC}"
    fi
    cd ..
}

# Function to run Docker Compose
deploy_services() {
    print_header "Deploying Services with Docker Compose"
    if [ ! -d "docker" ]; then
        echo -e "${RED}Docker directory not found!${NC}"
        return
    fi
    cd docker
    echo "Starting Docker containers..."
    docker-compose up -d
    echo -e "${GREEN}Services deployed.${NC}"
    cd ..
}

# Function to run Ansible
configure_workstation() {
    print_header "Configuring Workstation with Ansible"
    if [ ! -d "ansible" ]; then
        echo -e "${RED}Ansible directory not found!${NC}"
        return
    fi
    cd ansible
    if [ ! -f "inventory" ]; then
        echo -e "${YELLOW}Ansible inventory file not found. Please create one.${NC}"
        echo "Example 'inventory' file:"
        echo "[forensics_ws]"
        echo "192.168.1.100"
        cd ..
        return
    fi
    echo "Running Ansible playbook..."
    ansible-playbook -i inventory playbook.yml
    echo -e "${GREEN}Workstation configuration complete.${NC}"
    cd ..
}

# Main menu
main_menu() {
    while true; do
        print_header "Cyber Forensics Lab Framework - Main Menu"
        echo "1. Deploy Infrastructure (Terraform)"
        echo "2. Deploy Services (Docker)"
        echo "3. Configure Workstation (Ansible)"
        echo "4. Run All Steps"
        echo "5. Exit"
        read -p "Select an option [1-5]: " choice

        case $choice in
            1) deploy_infrastructure ;;
            2) deploy_services ;;
            3) configure_workstation ;;
            4)
                deploy_infrastructure
                deploy_services
                configure_workstation
                ;;
            5) exit 0 ;;
            *) echo -e "${RED}Invalid option. Please try again.${NC}" ;;
        esac
        echo
    done
}

# Run the main menu
main_menu
