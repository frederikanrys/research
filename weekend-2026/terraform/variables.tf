variable "aws_region" {
  description = "AWS region for S3 and other resources"
  type        = string
  default     = "eu-central-1"
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "bluesummit.be"
}

variable "subdomain" {
  description = "Subdomain for the website"
  type        = string
  default     = "www"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "bluesummit-www"
}
