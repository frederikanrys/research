import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import yaml from "js-yaml";

const WORKFLOW_PATH = resolve(
  __dirname,
  "../.github/workflows/deploy-weekend-2026.yml"
);

let workflow;

beforeAll(() => {
  expect(existsSync(WORKFLOW_PATH)).toBe(true);
  workflow = yaml.load(readFileSync(WORKFLOW_PATH, "utf-8"));
});

describe("workflow file", () => {
  it("has a descriptive name", () => {
    expect(workflow.name).toBeTruthy();
    expect(workflow.name.toLowerCase()).toContain("weekend-2026");
  });
});

describe("trigger configuration", () => {
  it("triggers on push to main", () => {
    expect(workflow.on.push.branches).toContain("main");
  });

  it("uses path filters to avoid unnecessary runs", () => {
    const paths = workflow.on.push.paths;
    expect(paths).toBeDefined();
    expect(paths.length).toBeGreaterThan(0);
  });

  it("path filters include output and terraform dirs", () => {
    const paths = workflow.on.push.paths;
    const joined = paths.join(" ");
    expect(joined).toMatch(/weekend-2026\/output/);
    expect(joined).toMatch(/weekend-2026\/terraform/);
  });
});

describe("permissions", () => {
  it("requests OIDC id-token for AWS auth", () => {
    expect(workflow.permissions["id-token"]).toBe("write");
  });

  it("requests read-only contents", () => {
    expect(workflow.permissions.contents).toBe("read");
  });
});

describe("terraform job", () => {
  const getJob = () => workflow.jobs.terraform;

  it("exists", () => {
    expect(getJob()).toBeDefined();
  });

  it("runs on ubuntu-latest", () => {
    expect(getJob()["runs-on"]).toBe("ubuntu-latest");
  });

  it("sets working directory to terraform folder", () => {
    expect(getJob().defaults.run["working-directory"]).toBe(
      "weekend-2026/terraform"
    );
  });

  it("outputs s3_bucket and distribution_id", () => {
    const outputs = getJob().outputs;
    expect(outputs.s3_bucket).toBeDefined();
    expect(outputs.distribution_id).toBeDefined();
  });

  it("checks out code", () => {
    const steps = getJob().steps;
    const checkout = steps.find((s) => s.uses && s.uses.includes("checkout"));
    expect(checkout).toBeDefined();
  });

  it("sets up terraform", () => {
    const steps = getJob().steps;
    const tfSetup = steps.find(
      (s) => s.uses && s.uses.includes("setup-terraform")
    );
    expect(tfSetup).toBeDefined();
  });

  it("configures AWS credentials via OIDC", () => {
    const steps = getJob().steps;
    const awsStep = steps.find(
      (s) => s.uses && s.uses.includes("configure-aws-credentials")
    );
    expect(awsStep).toBeDefined();
    expect(awsStep.with["role-to-assume"]).toContain("AWS_ROLE_ARN");
  });

  it("runs terraform init", () => {
    const steps = getJob().steps;
    const initStep = steps.find(
      (s) => s.run && s.run.includes("terraform init")
    );
    expect(initStep).toBeDefined();
  });

  it("runs terraform apply with auto-approve", () => {
    const steps = getJob().steps;
    const applyStep = steps.find(
      (s) => s.run && s.run.includes("terraform apply")
    );
    expect(applyStep).toBeDefined();
    expect(applyStep.run).toContain("-auto-approve");
  });
});

describe("deploy job", () => {
  const getJob = () => workflow.jobs.deploy;

  it("exists", () => {
    expect(getJob()).toBeDefined();
  });

  it("depends on terraform job", () => {
    expect(getJob().needs).toBe("terraform");
  });

  it("configures AWS credentials", () => {
    const steps = getJob().steps;
    const awsStep = steps.find(
      (s) => s.uses && s.uses.includes("configure-aws-credentials")
    );
    expect(awsStep).toBeDefined();
  });

  it("uploads to S3 using bucket from terraform output", () => {
    const steps = getJob().steps;
    const uploadStep = steps.find(
      (s) => s.run && s.run.includes("aws s3")
    );
    expect(uploadStep).toBeDefined();
    expect(uploadStep.run).toContain("s3_bucket");
    expect(uploadStep.run).toContain("weekend-2026");
  });

  it("invalidates CloudFront cache", () => {
    const steps = getJob().steps;
    const invalidateStep = steps.find(
      (s) => s.run && s.run.includes("create-invalidation")
    );
    expect(invalidateStep).toBeDefined();
    expect(invalidateStep.run).toContain("distribution_id");
    expect(invalidateStep.run).toContain("/weekend-2026/");
  });
});

describe("security best practices", () => {
  const workflowText = readFileSync(WORKFLOW_PATH, "utf-8");

  it("does not hardcode AWS credentials", () => {
    expect(workflowText).not.toMatch(/AKIA[A-Z0-9]{16}/);
    expect(workflowText).not.toMatch(/aws_access_key_id/i);
    expect(workflowText).not.toMatch(/aws_secret_access_key/i);
  });

  it("uses secrets for role ARN", () => {
    expect(workflowText).toContain("secrets.AWS_ROLE_ARN");
  });

  it("does not use wildcard permissions", () => {
    expect(workflow.permissions).not.toContain("write-all");
  });
});
