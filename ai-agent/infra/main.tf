# Personal AI Agent — Azure Infrastructure as Code
# Deploy with: terraform init && terraform apply

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "tfstateaiagent"
    container_name       = "tfstate"
    key                  = "personal-ai-agent.tfstate"
  }
}

provider "azurerm" {
  features {}
}

variable "resource_group_name" {
  default = "rg-personal-ai-agent"
}

variable "location" {
  default = "eastus"
}

variable "container_registry_name" {
  default = "personalaiagentacr"
}

variable "openai_api_key" {
  sensitive = true
}

variable "jwt_secret" {
  sensitive = true
}

# ── Resource Group ────────────────────────────────────────────────────────────
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
}

# ── Container Registry ────────────────────────────────────────────────────────
resource "azurerm_container_registry" "main" {
  name                = var.container_registry_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = true
}

# ── Azure Cosmos DB (MongoDB-compatible) ──────────────────────────────────────
resource "azurerm_cosmosdb_account" "main" {
  name                = "personal-ai-agent-cosmos"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  offer_type          = "Standard"
  kind                = "MongoDB"

  capabilities {
    name = "EnableMongo"
  }

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.main.location
    failover_priority = 0
  }
}

# ── Azure Cache for Redis ─────────────────────────────────────────────────────
resource "azurerm_redis_cache" "main" {
  name                = "personal-ai-agent-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 0
  family              = "C"
  sku_name            = "Basic"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
}

# ── Container Apps Environment ────────────────────────────────────────────────
resource "azurerm_log_analytics_workspace" "main" {
  name                = "personal-ai-agent-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
}

resource "azurerm_container_app_environment" "main" {
  name                       = "personal-ai-agent-env"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
}

# ── Backend Container App ─────────────────────────────────────────────────────
resource "azurerm_container_app" "backend" {
  name                         = "personal-ai-agent-backend"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.main.admin_password
  }
  secret {
    name  = "openai-api-key"
    value = var.openai_api_key
  }
  secret {
    name  = "jwt-secret"
    value = var.jwt_secret
  }

  template {
    container {
      name   = "backend"
      image  = "${azurerm_container_registry.main.login_server}/personal-ai-agent/backend:latest"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "MONGODB_URI"
        value = azurerm_cosmosdb_account.main.connection_strings[0]
      }
      env {
        name  = "REDIS_HOST"
        value = azurerm_redis_cache.main.hostname
      }
      env {
        name        = "OPENAI_API_KEY"
        secret_name = "openai-api-key"
      }
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 4000
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}

# ── Frontend Container App ────────────────────────────────────────────────────
resource "azurerm_container_app" "frontend" {
  name                         = "personal-ai-agent-frontend"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.main.admin_password
  }

  template {
    container {
      name   = "frontend"
      image  = "${azurerm_container_registry.main.login_server}/personal-ai-agent/frontend:latest"
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  ingress {
    external_enabled = true
    target_port      = 80
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}

output "backend_url" {
  value = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
}

output "frontend_url" {
  value = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
}
