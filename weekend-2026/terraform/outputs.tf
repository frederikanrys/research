output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.www.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.www.id
}

output "s3_bucket_name" {
  description = "S3 bucket name for uploading content"
  value       = aws_s3_bucket.www.bucket
}

output "website_url" {
  description = "Full URL to the weekend-2026 page"
  value       = "https://${var.subdomain}.${var.domain_name}/weekend-2026/"
}
