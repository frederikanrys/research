import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const TF_DIR = resolve(__dirname, "../weekend-2026/terraform");

function readTf(filename) {
  const path = resolve(TF_DIR, filename);
  return readFileSync(path, "utf-8");
}

describe("Terraform file structure", () => {
  it.each(["main.tf", "variables.tf", "outputs.tf", "backend.tf"])(
    "%s exists",
    (file) => {
      expect(existsSync(resolve(TF_DIR, file))).toBe(true);
    }
  );
});

describe("backend.tf", () => {
  const content = readTf("backend.tf");

  it("uses S3 backend", () => {
    expect(content).toContain('backend "s3"');
  });

  it("stores state under bluesummit-www key", () => {
    expect(content).toMatch(/key\s*=\s*"bluesummit-www\//);
  });

  it("enables encryption", () => {
    expect(content).toMatch(/encrypt\s*=\s*true/);
  });

  it("uses DynamoDB for locking", () => {
    expect(content).toContain("dynamodb_table");
  });

  it("requires terraform >= 1.5", () => {
    expect(content).toMatch(/required_version\s*=\s*">= 1\.5"/);
  });
});

describe("variables.tf", () => {
  const content = readTf("variables.tf");

  it("defines domain_name with bluesummit.be default", () => {
    expect(content).toContain('"bluesummit.be"');
  });

  it("defines subdomain with www default", () => {
    expect(content).toMatch(/variable\s+"subdomain"/);
    expect(content).toContain('"www"');
  });

  it("defines aws_region with eu-central-1 default", () => {
    expect(content).toContain('"eu-central-1"');
  });

  it("defines project_name", () => {
    expect(content).toMatch(/variable\s+"project_name"/);
  });
});

describe("main.tf — required resources", () => {
  const content = readTf("main.tf");

  it("has default provider in eu-central-1", () => {
    expect(content).toMatch(/provider\s+"aws"\s*\{/);
    expect(content).toContain("var.aws_region");
  });

  it("has us-east-1 provider for ACM", () => {
    expect(content).toMatch(/alias\s*=\s*"us_east_1"/);
    expect(content).toContain('"us-east-1"');
  });

  it("looks up existing Route53 zone", () => {
    expect(content).toMatch(
      /data\s+"aws_route53_zone"\s+"main"/
    );
  });

  it("creates S3 bucket", () => {
    expect(content).toMatch(
      /resource\s+"aws_s3_bucket"\s+"www"/
    );
  });

  it("blocks public access on S3 bucket", () => {
    expect(content).toMatch(
      /resource\s+"aws_s3_bucket_public_access_block"\s+"www"/
    );
    expect(content).toContain("block_public_acls");
    expect(content).toContain("block_public_policy");
  });

  it("creates CloudFront OAC", () => {
    expect(content).toMatch(
      /resource\s+"aws_cloudfront_origin_access_control"\s+"www"/
    );
    expect(content).toContain('"s3"');
    expect(content).toContain('"always"');
  });

  it("creates ACM certificate in us-east-1", () => {
    expect(content).toMatch(
      /resource\s+"aws_acm_certificate"\s+"www"/
    );
    expect(content).toContain("aws.us_east_1");
    expect(content).toContain("DNS");
  });

  it("creates DNS validation records for ACM", () => {
    expect(content).toMatch(
      /resource\s+"aws_route53_record"\s+"www_cert_validation"/
    );
  });

  it("waits for ACM certificate validation", () => {
    expect(content).toMatch(
      /resource\s+"aws_acm_certificate_validation"\s+"www"/
    );
  });

  it("creates CloudFront distribution with correct alias", () => {
    expect(content).toMatch(
      /resource\s+"aws_cloudfront_distribution"\s+"www"/
    );
    expect(content).toContain("var.subdomain");
    expect(content).toContain("var.domain_name");
  });

  it("CloudFront redirects HTTP to HTTPS", () => {
    expect(content).toContain("redirect-to-https");
  });

  it("CloudFront uses TLS 1.2+", () => {
    expect(content).toContain("TLSv1.2_2021");
  });

  it("sets default_root_object to index.html", () => {
    expect(content).toMatch(/default_root_object\s*=\s*"index.html"/);
  });

  it("creates S3 bucket policy for CloudFront access", () => {
    expect(content).toMatch(
      /resource\s+"aws_s3_bucket_policy"\s+"www"/
    );
    expect(content).toContain("cloudfront.amazonaws.com");
  });

  it("creates Route53 A record aliased to CloudFront", () => {
    expect(content).toMatch(
      /resource\s+"aws_route53_record"\s+"www"/
    );
    expect(content).toContain('"A"');
    expect(content).toContain("alias");
  });
});

describe("outputs.tf", () => {
  const content = readTf("outputs.tf");

  it("outputs cloudfront_domain", () => {
    expect(content).toMatch(/output\s+"cloudfront_domain"/);
  });

  it("outputs cloudfront_distribution_id", () => {
    expect(content).toMatch(/output\s+"cloudfront_distribution_id"/);
  });

  it("outputs s3_bucket_name", () => {
    expect(content).toMatch(/output\s+"s3_bucket_name"/);
  });

  it("outputs website_url with correct path", () => {
    expect(content).toMatch(/output\s+"website_url"/);
    expect(content).toContain("/weekend-2026/");
  });
});
