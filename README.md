# Cyber Security Crime Intelligence Unit - Forensics Lab Framework

This project provides a comprehensive, Infrastructure-as-Code (IaC) framework for setting up and managing a digital forensics lab. It includes components for network infrastructure, service deployment, workstation configuration, and operational procedures.

## ✨ Features

- **Infrastructure as Code (IaC):** Uses Terraform to provision a vSphere-based virtual forensics workstation.
- **Containerized Tools:** Deploys commercial forensics tools like Magnet AXIOM and Passware Kit Forensic using Docker Compose.
- **Automated Workstation Setup:** Includes an Ansible playbook to harden and install open-source forensics tools on Ubuntu.
- **Imaging Automation:** A Python script to automate the forensic imaging of drives.
- **Standardized Procedures:** Provides a Standard Operating Procedure (SOP) for evidence intake.
- **Lab Diagrams:** Includes PlantUML diagrams for the network and physical lab layout.

## 📂 Project Structure

```
.
├── README.md
├── ansible
│   └── playbook.yml
├── docker
│   └── docker-compose.yml
├── docs
│   └── sop_evidence_intake.md
├── plantuml
│   ├── floor_plan.puml
│   └── network_diagram.puml
├── scripts
│   └── image_drive.py
├── setup_lab.sh
└── terraform
    ├── main.tf
    └── variables.tf
```

## 🚀 Getting Started

### Prerequisites

- [Terraform](https://www.terraform.io/downloads.html)
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)
- [Python 3](https://www.python.org/downloads/)
- Access to a VMware vSphere environment.
- Access to the Docker registries for Magnet AXIOM and Passware (if using the containerized tools).

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```
2.  **Configure Terraform:**
    - Create a `terraform.tfvars` file in the `terraform/` directory.
    - Add your vSphere credentials and server details:
      ```hcl
      vsphere_user     = "your-vsphere-user"
      vsphere_password = "your-vsphere-password"
      vsphere_server   = "your-vsphere-server-ip"
      ```
    - Update the data sources in `terraform/main.tf` to match your vSphere environment's datacenter, datastore, resource pool, and VM template names.

3.  **Configure Ansible:**
    - Create an inventory file (e.g., `hosts`) in the `ansible/` directory with the IP address or hostname of the forensics workstation you will provision.

## Usage

This framework can be orchestrated using the main `setup_lab.sh` script (coming in the next step), or you can run each component individually.

### Terraform (Infrastructure)

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Docker (Services)

```bash
cd docker
docker-compose up -d
```

### Ansible (Workstation Configuration)

```bash
cd ansible
ansible-playbook -i your_inventory_file playbook.yml
```

### Python (Drive Imaging)

```bash
cd scripts
sudo python3 image_drive.py --device /dev/sdX --case CASE-001
```

##  Diagrams

The lab's logical and physical layouts are defined in the `plantuml` directory. You can view and edit them using a PlantUML renderer.

- **[Network Diagram](plantuml/network_diagram.puml)**
- **[Floor Plan](plantuml/floor_plan.puml)**

## ⚠️ Disclaimer

The Docker Compose configuration includes services for proprietary, commercial software (Magnet AXIOM, Passware). The container images for these tools are not public. You must have the appropriate licenses and access to their private Docker registries to use them. This framework provides a way to orchestrate their deployment but does not provide the software itself.
