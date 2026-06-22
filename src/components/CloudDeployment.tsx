import React, { useState } from 'react';
import { 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Globe, 
  ShieldCheck, 
  DollarSign, 
  CheckCircle2, 
  TrendingUp, 
  Info,
  Layers
} from 'lucide-react';

interface CloudService {
  name: string;
  category: string;
  aws: {
    service: string;
    description: string;
  };
  gcp: {
    service: string;
    description: string;
  };
  oci: {
    service: string;
    description: string;
  };
  icon: React.ReactNode;
}

interface CostItem {
  item: string;
  awsCost: number;
  gcpCost: number;
  ociCost: number;
  description: string;
}

export const CloudDeployment: React.FC = () => {
  const [scale, setScale] = useState<'startup' | 'production'>('startup');
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  // Toggle migration checklist tasks
  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => 
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Service Mapping Definition
  const services: CloudService[] = [
    {
      name: 'Backend API Service',
      category: 'Compute',
      icon: <Server size={18} />,
      aws: {
        service: 'AWS App Runner / ECS Fargate',
        description: 'Runs the dockerized NestJS API in serverless containers. Handles traffic auto-scaling.'
      },
      gcp: {
        service: 'GCP Cloud Run',
        description: 'Serverless container execution for NestJS. Scales down to zero to reduce idle costs.'
      },
      oci: {
        service: 'OCI Container Instances',
        description: 'Serverless container runtimes. Deploy backend Docker containers instantly with highly competitive resource pricing.'
      }
    },
    {
      name: 'Relational Database',
      category: 'Database',
      icon: <Database size={18} />,
      aws: {
        service: 'Amazon RDS for PostgreSQL',
        description: 'Fully managed relational database instance with automated snapshots and read-replicas.'
      },
      gcp: {
        service: 'GCP Cloud SQL for PostgreSQL',
        description: 'Managed database hosting. Seamlessly isolates data and integrates IAM validation.'
      },
      oci: {
        service: 'OCI PostgreSQL Database',
        description: 'Managed relational PostgreSQL database service. Backed by Oracle Cloud Database engines with built-in high performance and encryption.'
      }
    },
    {
      name: 'Asynchronous Task Cache',
      category: 'Caching & Queue',
      icon: <Cpu size={18} />,
      aws: {
        service: 'Amazon ElastiCache for Redis',
        description: 'Serverless caching cluster supporting BullMQ workers for background jobs and Google Calendar sync.'
      },
      gcp: {
        service: 'GCP Memorystore for Redis',
        description: 'In-memory Redis service. Powers BullMQ queues with minimal latency and high availability.'
      },
      oci: {
        service: 'OCI Cache for Redis',
        description: 'Fully managed Redis service. Directly supports fast application queues, asynchronous calendar workers, and mood logs.'
      }
    },
    {
      name: 'Object Storage',
      category: 'Storage',
      icon: <HardDrive size={18} />,
      aws: {
        service: 'Amazon S3',
        description: 'Encrypted buckets for storing therapist certifications, client mood logs, and static documents.'
      },
      gcp: {
        service: 'GCP Cloud Storage (GCS)',
        description: 'Secure bucket storage with default lifecycle management rules and fine-grained access.'
      },
      oci: {
        service: 'OCI Object Storage',
        description: 'Highly durable storage buckets with native client-managed key encryption and customizable lifecycle management rules.'
      }
    },
    {
      name: 'Web Applications',
      category: 'Static Frontend',
      icon: <Globe size={18} />,
      aws: {
        service: 'Amazon S3 + CloudFront CDN',
        description: 'Serves the built Therapist and Client React SPAs globally with HTTPS and edge routing.'
      },
      gcp: {
        service: 'GCP Firebase Hosting / GCS + Cloud CDN',
        description: 'Edge-cached hosting for React web portals, offering fast global load times and native SSL.'
      },
      oci: {
        service: 'OCI Object Storage + OCI CDN',
        description: 'Hosts Therapist and Client React portals in public read buckets fronted by Oracle Content Delivery Network.'
      }
    },
    {
      name: 'Security & Compliance',
      category: 'Compliance',
      icon: <ShieldCheck size={18} />,
      aws: {
        service: 'KMS + CloudTrail + AWS WAF',
        description: 'Ensures HIPAA compliance via database encryption-at-rest, audit logs, and web firewall filters.'
      },
      gcp: {
        service: 'Cloud KMS + Cloud Audit + Cloud Armor',
        description: 'Provides client encryption keys, detailed resource access records, and DDoS mitigation.'
      },
      oci: {
        service: 'OCI Vault + OCI Audit + OCI WAF',
        description: 'Provides envelope encryption for patient logs, unified audit trails, and web application firewall security.'
      }
    }
  ];

  // Cost Definition
  const costBreakdown: CostItem[] = scale === 'startup' ? [
    { item: 'Backend Compute (NestJS API)', awsCost: 15, gcpCost: 10, ociCost: 8, description: 'Single container instance with minimal resource reservation (0.25 vCPU, 512MB RAM).' },
    { item: 'Managed PostgreSQL Database', awsCost: 15, gcpCost: 12, ociCost: 10, description: 'Micro-sized database instance.' },
    { item: 'BullMQ Queue Cache (Redis)', awsCost: 18, gcpCost: 16, ociCost: 12, description: 'Small cluster size or hosted instance for handling background sync operations.' },
    { item: 'File & SPA Asset Storage', awsCost: 2, gcpCost: 2, ociCost: 1, description: 'Under 50GB storage usage. OCI provides 20GB free in Always Free tier.' },
    { item: 'Bandwidth & CDN Routing', awsCost: 5, gcpCost: 5, ociCost: 0, description: 'Low data egress. OCI offers first 10TB of egress completely free.' }
  ] : [
    { item: 'Backend Compute (NestJS API)', awsCost: 120, gcpCost: 90, ociCost: 70, description: 'Multi-instance auto-scaling containers (min 2 instances across Availability Zones).' },
    { item: 'Managed PostgreSQL Database', awsCost: 180, gcpCost: 140, ociCost: 110, description: 'High-availability configuration (Multi-AZ replication, 2 vCPUs, 8GB RAM).' },
    { item: 'BullMQ Queue Cache (Redis)', awsCost: 70, gcpCost: 60, ociCost: 45, description: 'Multi-AZ cache node cluster with failover replication.' },
    { item: 'File & SPA Asset Storage', awsCost: 25, gcpCost: 25, ociCost: 10, description: 'Over 500GB storage usage with active backup policies.' },
    { item: 'Bandwidth & CDN Routing', awsCost: 40, gcpCost: 40, ociCost: 10, description: 'Higher egress bandwidth for video/teletherapy syncs and documents (OCI egress remains cheapest).' },
    { item: 'Security & Compliance Logging', awsCost: 50, gcpCost: 40, ociCost: 30, description: 'WAF filters, detailed vault keys, and audit logging configurations.' }
  ];

  const totalAwsCost = costBreakdown.reduce((sum, item) => sum + item.awsCost, 0);
  const totalGcpCost = costBreakdown.reduce((sum, item) => sum + item.gcpCost, 0);
  const totalOciCost = costBreakdown.reduce((sum, item) => sum + item.ociCost, 0);

  // Migration Checklist tasks
  const migrationTasks = [
    { id: 't1', title: 'Dockerize Backend Service', desc: 'Create a production-grade multi-stage Dockerfile for apps/api. Set environment variables mapping dynamically.' },
    { id: 't2', title: 'Prepare PostgreSQL Schema Migrations', desc: 'Verify local prisma/knex migration files. Set up database credentials in the cloud console.' },
    { id: 't3', title: 'Set up Secret Manager integration', desc: 'Provision AWS Secrets Manager, GCP Secret Manager, or OCI Vault to hold Supabase Keys, Razorpay Webhooks, and SMTP parameters.' },
    { id: 't4', title: 'Configure CDN SPA buckets', desc: 'Build React assets for apps/therapist and apps/client. Set upload scripts to S3/GCS/OCI Storage with gzip/brotli compression.' },
    { id: 't5', title: 'Configure Domain Name System (DNS) & SSL', desc: 'Point subdomains (api.emotist.com, therapist.emotist.com) via Route 53, Cloud DNS, or OCI DNS. Bind auto-renewing SSL certificates.' },
    { id: 't6', title: 'Deploy Background Redis Node', desc: 'Set up ElastiCache, Memorystore, or OCI Cache for Redis. Test network connection from NestJS container to guarantee BullMQ task pickup.' },
    { id: 't7', title: 'Build CI/CD Deployment Pipelines', desc: 'Establish GitHub Actions YAML files to run tests, build docker images, push to registry (ECR/GCR/OCIR), and update the compute tasks.' },
    { id: 't8', title: 'Sign Cloud BAA & Setup Audit Logs', desc: 'Sign the cloud provider Business Associate Agreement (BAA) for HIPAA compliance. Enable logging for db operations and network firewalls.' }
  ];

  return (
    <div className="cloud-container">
      {/* Page Header */}
      <div className="cloud-header">
        <div>
          <h1 className="cloud-heading">Cloud Deployment Planner</h1>
          <p className="cloud-subtitle">
            Compare infrastructure mappings, estimate operational costs, evaluate complexity, and plan migration tasks for GCP, AWS, and OCI.
          </p>
        </div>

        {/* Scale Selector */}
        <div className="scale-selector">
          <button 
            className={`scale-btn ${scale === 'startup' ? 'active' : ''}`}
            onClick={() => setScale('startup')}
          >
            🌱 Startup / MVP
          </button>
          <button 
            className={`scale-btn ${scale === 'production' ? 'active' : ''}`}
            onClick={() => setScale('production')}
          >
            🏢 Production / Scale
          </button>
        </div>
      </div>

      {/* Overview stats cards */}
      <div className="cloud-stats-grid">
        <div className="cloud-stat-card">
          <div className="stat-icon-wrapper">
            <DollarSign size={20} className="stat-icon" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Estimated AWS Cost</span>
            <span className="stat-value">${totalAwsCost} <span className="stat-unit">/ mo</span></span>
          </div>
        </div>

        <div className="cloud-stat-card">
          <div className="stat-icon-wrapper gcp">
            <DollarSign size={20} className="stat-icon" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Estimated GCP Cost</span>
            <span className="stat-value">${totalGcpCost} <span className="stat-unit">/ mo</span></span>
          </div>
        </div>

        <div className="cloud-stat-card">
          <div className="stat-icon-wrapper oci">
            <DollarSign size={20} className="stat-icon" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Estimated OCI Cost</span>
            <span className="stat-value">${totalOciCost} <span className="stat-unit">/ mo</span></span>
          </div>
        </div>

        <div className="cloud-stat-card">
          <div className="stat-icon-wrapper complexity">
            <Layers size={20} className="stat-icon" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Complexity</span>
            <span className="stat-value">{scale === 'startup' ? 'Low-Med' : 'Med-High'}</span>
          </div>
        </div>

        <div className="cloud-stat-card">
          <div className="stat-icon-wrapper compliance">
            <ShieldCheck size={20} className="stat-icon" />
          </div>
          <div className="stat-info">
            <span className="stat-label">HIPAA</span>
            <span className="stat-value">Ready (BAA)</span>
          </div>
        </div>
      </div>

      {/* Service Mappings Section */}
      <div className="cloud-section">
        <h2 className="section-title">
          <Layers size={18} /> Service Architectures Comparison
        </h2>
        <div className="service-mapping-grid">
          {services.map((svc) => (
            <div key={svc.name} className="service-card">
              <div className="service-card-header">
                <span className="service-category">{svc.category}</span>
                <span className="service-icon-container">{svc.icon}</span>
              </div>
              <h3 className="service-name">{svc.name}</h3>
              
              <div className="provider-mappings">
                <div className="provider-block aws">
                  <div className="provider-badge">AWS</div>
                  <div className="provider-service-name">{svc.aws.service}</div>
                  <p className="provider-desc">{svc.aws.description}</p>
                </div>
                
                <div className="provider-block gcp">
                  <div className="provider-badge">GCP</div>
                  <div className="provider-service-name">{svc.gcp.service}</div>
                  <p className="provider-desc">{svc.gcp.description}</p>
                </div>

                <div className="provider-block oci">
                  <div className="provider-badge">OCI</div>
                  <div className="provider-service-name">{svc.oci.service}</div>
                  <p className="provider-desc">{svc.oci.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Costs & Complexity Comparison */}
      <div className="cloud-split-grid">
        {/* Cost Table */}
        <div className="cloud-card">
          <div className="card-header">
            <h3 className="card-title">
              <DollarSign size={18} /> Monthly Cost Estimation ({scale === 'startup' ? 'Startup' : 'Production'} scale)
            </h3>
            <span className="comparison-badge">
              {`OCI saves $${totalAwsCost - totalOciCost}/mo vs AWS`}
            </span>
          </div>
          
          <div className="table-responsive">
            <table className="cost-table">
              <thead>
                <tr>
                  <th>Infrastructure Asset</th>
                  <th className="align-right">AWS ($)</th>
                  <th className="align-right">GCP ($)</th>
                  <th className="align-right">OCI ($)</th>
                </tr>
              </thead>
              <tbody>
                {costBreakdown.map((c) => (
                  <tr key={c.item}>
                    <td>
                      <div className="cost-item-name">{c.item}</div>
                      <div className="cost-item-desc">{c.description}</div>
                    </td>
                    <td className="align-right font-mono font-semibold">${c.awsCost}</td>
                    <td className="align-right font-mono font-semibold">${c.gcpCost}</td>
                    <td className="align-right font-mono font-semibold">${c.ociCost}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total Estimated Cost</td>
                  <td className="align-right font-mono">${totalAwsCost} / mo</td>
                  <td className="align-right font-mono">${totalGcpCost} / mo</td>
                  <td className="align-right font-mono">${totalOciCost} / mo</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="cost-disclaimer">
            <Info size={14} />
            <span>Prices are estimates based on standard pay-as-you-go public pricing schedules. Compute estimates include average network traffic and load balancers.</span>
          </div>
        </div>

        {/* Complexity & Compliance Details */}
        <div className="cloud-card">
          <h3 className="card-title">
            <ShieldCheck size={18} /> Deployment Complexity & HIPAA Compliance
          </h3>
          
          <div className="complexity-blocks">
            <div className="info-block">
              <div className="info-block-header">
                <TrendingUp size={16} />
                <span>Operational Complexity Breakdown</span>
              </div>
              <p>
                {scale === 'startup' ? (
                  'Startup tier runs simplified configurations (single instance DB, App Runner/Cloud Run/OCI Container Instances). Operational overhead is low, autoscaling is managed automatically by the cloud compute layer, and containerized deployment prevents server configuration drift.'
                ) : (
                  'Production configurations add Multi-AZ database clusters, Redis replication nodes, Cloud WAF/Armor/OCI WAF rules, and automated failover pipelines. Requires active DevOps configuration management, database backup verification, and continuous infrastructure health probes.'
                )}
              </p>
            </div>

            <div className="info-block">
              <div className="info-block-header">
                <ShieldCheck size={16} />
                <span>Clinical Data Security & HIPAA Requirements</span>
              </div>
              <p>
                As a teletherapy application, Emotist processes Protected Health Information (PHI) like mood logs, journal contents, and patient session scheduling. HIPAA compliance checklist:
              </p>
              <ul className="compliance-list">
                <li><strong>Cloud BAA</strong>: Business Associate Agreement must be e-signed on the cloud console before routing clinical traffic.</li>
                <li><strong>Encryption-at-Rest</strong>: PostgreSQL disks, S3/GCS/OCI Storage buckets, and Redis nodes must configure customer-managed KMS/Vault keys.</li>
                <li><strong>Secure Transit</strong>: Enforce HTTPS/TLS 1.3 on all REST endpoints and disable older TLS protocols on the Application Load Balancer.</li>
                <li><strong>Audit Logs</strong>: Database query logs, server access records, and admin panel logins must stream to a queryable log bucket for 6+ years.</li>
              </ul>
            </div>

            <div className="cloud-comparison-bar">
              <div className="provider-bar-wrapper">
                <div className="provider-bar-header">
                  <span>AWS Setup Complexity</span>
                  <span className="rating font-semibold">Medium (7/10)</span>
                </div>
                <div className="bar-outer">
                  <div className="bar-inner aws" style={{ width: '70%' }}></div>
                </div>
              </div>

              <div className="provider-bar-wrapper">
                <div className="provider-bar-header">
                  <span>GCP Setup Complexity</span>
                  <span className="rating font-semibold">Low-Medium (5/10)</span>
                </div>
                <div className="bar-outer">
                  <div className="bar-inner gcp" style={{ width: '50%' }}></div>
                </div>
              </div>

              <div className="provider-bar-wrapper">
                <div className="provider-bar-header">
                  <span>OCI Setup Complexity</span>
                  <span className="rating font-semibold">Low-Medium (6/10)</span>
                </div>
                <div className="bar-outer">
                  <div className="bar-inner oci" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Action Tasks List */}
      <div className="cloud-section">
        <div className="tasks-header">
          <h2 className="section-title">
            <CheckCircle2 size={18} /> Cloud Migration Action Checklist
          </h2>
          <span className="tasks-progress-badge">
            {completedTasks.length} of {migrationTasks.length} steps completed ({Math.round((completedTasks.length / migrationTasks.length) * 100)}%)
          </span>
        </div>

        <div className="migration-tasks-list">
          {migrationTasks.map((t, idx) => {
            const isCompleted = completedTasks.includes(t.id);
            return (
              <div 
                key={t.id} 
                className={`migration-task-item ${isCompleted ? 'completed' : ''}`}
                onClick={() => toggleTask(t.id)}
              >
                <div className="task-checkbox-container">
                  <div className={`checkbox-indicator ${isCompleted ? 'checked' : ''}`}>
                    {isCompleted && <CheckCircle2 size={16} />}
                  </div>
                </div>
                
                <div className="task-content">
                  <div className="task-title-row">
                    <span className="task-step-number">Step {idx + 1}</span>
                    <h4 className="task-item-title">{t.title}</h4>
                  </div>
                  <p className="task-item-desc">{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
