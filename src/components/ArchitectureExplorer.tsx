import React, { useState } from 'react';
import { Network, Container, Layers, Server, FileText, CheckCircle2 } from 'lucide-react';

type ArchTab = 'scope' | 'container' | 'layers' | 'eks' | 'adr';

export const ArchitectureExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ArchTab>('scope');
  const [selectedNode, setSelectedNode] = useState<string>('api');

  return (
    <div className="arch-explorer-container">
      <div className="arch-header">
        <div>
          <h1 className="arch-heading">Architecture & System Design Explorer</h1>
          <p className="arch-subtitle">Interactive visualizer of the Emotist system structure, deployment topologies, and key architectural decisions.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="arch-tabs">
        <button
          className={`arch-tab-btn ${activeTab === 'scope' ? 'active' : ''}`}
          onClick={() => setActiveTab('scope')}
        >
          <Network size={16} /> Business Context
        </button>
        <button
          className={`arch-tab-btn ${activeTab === 'container' ? 'active' : ''}`}
          onClick={() => setActiveTab('container')}
        >
          <Container size={16} /> Container Diagram
        </button>
        <button
          className={`arch-tab-btn ${activeTab === 'layers' ? 'active' : ''}`}
          onClick={() => setActiveTab('layers')}
        >
          <Layers size={16} /> DDD Clean Layers
        </button>
        <button
          className={`arch-tab-btn ${activeTab === 'eks' ? 'active' : ''}`}
          onClick={() => setActiveTab('eks')}
        >
          <Server size={16} /> EKS Infrastructure
        </button>
        <button
          className={`arch-tab-btn ${activeTab === 'adr' ? 'active' : ''}`}
          onClick={() => setActiveTab('adr')}
        >
          <FileText size={16} /> Architecture Decisions
        </button>
      </div>

      {/* Tab Contents */}
      <div className="arch-tab-content">
        
        {/* Tab 1: Scope & Business Context */}
        {activeTab === 'scope' && (
          <div className="tab-pane-container">
            <div className="pane-left">
              <h2>Emotist Business Scope</h2>
              <p className="pane-intro">The business context defines how human actors interact with the software boundaries and the external messaging providers.</p>
              
              <div className="context-list">
                <div className="context-item-card">
                  <div className="context-item-header therapist">Therapist (Actor)</div>
                  <p>Mental health professional who utilizes Emotist to manage client accounts, configure clinical availability calendars, record session charting notes, and assign therapeutic tasks.</p>
                </div>
                <div className="context-item-card">
                  <div className="context-item-header client">Client (Actor)</div>
                  <p>Individual seeking therapy. They browse verified therapist profiles, select booking slots, pay for sessions, join video consultations, and log completed assignments.</p>
                </div>
                <div className="context-item-card">
                  <div className="context-item-header external">Supabase Service</div>
                  <p>Provides core persistence, identity provisioning (auth), object buckets, and WebSocket-based realtime chat triggers.</p>
                </div>
              </div>
            </div>

            <div className="pane-right">
              <h2>External Communications</h2>
              <div className="external-item-card">
                <h3>Postmark Email Service</h3>
                <p>Sends system emails including client invitation links, appointment receipts, and daily session schedule reminders.</p>
              </div>
              <div className="external-item-card">
                <h3>MSG91 SMS Service</h3>
                <p>Sends transactional SMS alerts, login verification OTPs, and schedule change updates to therapists and clients.</p>
              </div>
              <div className="external-item-card">
                <h3>Jitsi Video Conference</h3>
                <p>Self-hosted server providing secure, high-definition, peer-to-peer webRTC video consult rooms.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Container Diagram */}
        {activeTab === 'container' && (
          <div className="tab-pane-container">
            <div className="pane-left">
              <h2>System Containers Topology</h2>
              <p className="pane-intro">Select a container card on the right map to view its responsibilities, endpoints, and communication protocols.</p>

              {selectedNode === 'therapist-web' && (
                <div className="details-card active">
                  <h3>Therapist Web App (ReactJS)</h3>
                  <div className="details-badge react">Container: Client Frontend</div>
                  <p>Web interface for therapists built with React and TypeScript. Fetches profile configs, maps working schedule hours, manages clients checklists, and hosts chat components.</p>
                  <ul>
                    <li><strong>Communicates with</strong>: Backend API (HTTP/JSON), Supabase Auth (REST), Supabase Realtime (WebSocket).</li>
                    <li><strong>Critical Modules</strong>: Mobiscroll Scheduler, Account Setup Wizard, Client Records Directory.</li>
                  </ul>
                </div>
              )}

              {selectedNode === 'client-mobile' && (
                <div className="details-card active">
                  <h3>Client Mobile App (React Native)</h3>
                  <div className="details-badge mobile">Container: Expo App</div>
                  <p>Cross-platform application built with React Native and Expo. Enables clients to browse directories, purchase sessions, complete exercises, and interact with clinicians.</p>
                  <ul>
                    <li><strong>Communicates with</strong>: Backend API (HTTP/JSON), Supabase Auth (REST), Supabase Realtime (WebSocket), Razorpay SDK.</li>
                    <li><strong>Key Screens</strong>: Time-slot Datepicker Carousel, Assigned Tasks Mood Logs, Chat Messenger.</li>
                  </ul>
                </div>
              )}

              {selectedNode === 'api' && (
                <div className="details-card active">
                  <h3>Backend API Server (NestJS)</h3>
                  <div className="details-badge nest">Container: REST API</div>
                  <p>Processes business rules and coordinates transactional database flows. Follows Domain-Driven Design (DDD) with clean layers, exporting Swagger endpoints.</p>
                  <ul>
                    <li><strong>Communicates with</strong>: Supabase Postgres (TCP), Redis Cache (TCP), Postmark/MSG91 (REST).</li>
                    <li><strong>Frameworks</strong>: NestJS, TypeORM/Supabase client, nestjs-cls, BullMQ Task Workers.</li>
                  </ul>
                </div>
              )}

              {selectedNode === 'supabase' && (
                <div className="details-card active">
                  <h3>Supabase Service</h3>
                  <div className="details-badge database">Container: Persistence</div>
                  <p>Exposes managed database engine, user tables, and storage buckets. Emits database logs for CDC outbox triggers.</p>
                  <ul>
                    <li><strong>Critical Features</strong>: PostgreSQL schema, Row-Level Security (RLS) rules, private-assets buckets.</li>
                  </ul>
                </div>
              )}

              {selectedNode === 'redis' && (
                <div className="details-card active">
                  <h3>Redis Cache & BullMQ</h3>
                  <div className="details-badge queue">Container: Task Queue</div>
                  <p>In-memory cache cluster. Hosts queues managed by BullMQ for event outbox processing and notification tasks.</p>
                  <ul>
                    <li><strong>Role</strong>: Decouples contexts via publish/subscribe. Buffers emails, SMS alerts, and calendar syncing.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Container Visual Map */}
            <div className="pane-right map-container">
              <div className="diagram-grid">
                
                <div className="diagram-row flex-row">
                  <div 
                    className={`node-card frontend ${selectedNode === 'therapist-web' ? 'selected' : ''}`}
                    onClick={() => setSelectedNode('therapist-web')}
                  >
                    <h4>Therapist Web App</h4>
                    <span>React JS • Port 5173</span>
                  </div>
                  
                  <div 
                    className={`node-card frontend ${selectedNode === 'client-mobile' ? 'selected' : ''}`}
                    onClick={() => setSelectedNode('client-mobile')}
                  >
                    <h4>Client Mobile App</h4>
                    <span>React Native • Expo</span>
                  </div>
                </div>

                <div className="arrow-down">↕ HTTP/REST</div>

                <div className="diagram-row">
                  <div 
                    className={`node-card backend ${selectedNode === 'api' ? 'selected' : ''}`}
                    onClick={() => setSelectedNode('api')}
                  >
                    <h4>Backend API</h4>
                    <span>NestJS + TypeScript • Port 3000</span>
                  </div>
                </div>

                <div className="arrow-down-split">↙ TCP / CDC 　　　　　　 ↘ TCP</div>

                <div className="diagram-row flex-row">
                  <div 
                    className={`node-card storage ${selectedNode === 'supabase' ? 'selected' : ''}`}
                    onClick={() => setSelectedNode('supabase')}
                  >
                    <h4>Supabase Service</h4>
                    <span>PostgreSQL + Auth</span>
                  </div>

                  <div 
                    className={`node-card storage ${selectedNode === 'redis' ? 'selected' : ''}`}
                    onClick={() => setSelectedNode('redis')}
                  >
                    <h4>Redis Sentinel</h4>
                    <span>BullMQ Queue Cache</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Tab 3: DDD Clean Layering */}
        {activeTab === 'layers' && (
          <div className="tab-pane-container">
            <div className="pane-left">
              <h2>DDD Clean Architecture Ring</h2>
              <p className="pane-intro">The backend codebase restricts architectural dependencies, pointing inwards from Infrastructure towards Domain logic.</p>
              
              <div className="ring-details-list">
                <div className="ring-layer-detail core">
                  <h3>1. Inner Core: Domain Layer</h3>
                  <p>Contains pure domain concepts. Contains no references to database engines or NestJS frameworks. Highly testable.</p>
                  <ul>
                    <li><strong>Contains</strong>: Entities (Models), Repositories Contracts, Domain Events (`TherapistInvitedClientEvent`).</li>
                  </ul>
                </div>
                <div className="ring-layer-detail application">
                  <h3>2. Middle Core: Application Layer</h3>
                  <p>Orchestrates business use cases. Resolves interfaces, maps commands/queries using CQRS buses, and manages services.</p>
                  <ul>
                    <li><strong>Contains</strong>: Command handlers, Query builders, Use Cases Services (`TherapistService`), DTO mappers.</li>
                  </ul>
                </div>
                <div className="ring-layer-detail infra">
                  <h3>3. Outer Ring: Infrastructure Layer</h3>
                  <p>Handles framework wiring. Exposes REST controllers, database persisters, CDC listeners, and SMS/Email adapters.</p>
                  <ul>
                    <li><strong>Contains</strong>: Controllers (`TherapistController`), Supabase TypeORM implementations, Outbox processors.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pane-right visual-rings-panel">
              <div className="onion-ring-container">
                <div className="onion-outer">
                  <span className="ring-label label-outer">Infrastructure</span>
                  <div className="onion-middle">
                    <span className="ring-label label-middle">Application</span>
                    <div className="onion-inner">
                      <span className="ring-label label-inner">Domain Core</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: EKS Deployment */}
        {activeTab === 'eks' && (
          <div className="tab-pane-container">
            <div className="pane-left">
              <h2>EKS Deployment Infrastructure</h2>
              <p className="pane-intro">Visualizes the VPC networking, subnets, and routing gateways deployed in the AWS Mumbai (`ap-south-1`) region.</p>
              
              <div className="eks-details">
                <div className="eks-card">
                  <h4>Public Internet Gateway</h4>
                  <p>Recruits incoming public traffic. Directs queries through **AWS Managed Network Load Balancers (NLB)**.</p>
                </div>
                <div className="eks-card">
                  <h4>Public Subnets</h4>
                  <p>Segmented VPC boundary holding the **Envoy External Gateway API** and NAT Gateways. Routes queries to backend application workloads.</p>
                </div>
                <div className="eks-card">
                  <h4>Isolated Private Subnets</h4>
                  <p>Houses the EKS worker nodes containing core application pods (Therapist portal, Client portal, NestJS API engine, Redis Sentinel caches). Blocks direct public access.</p>
                </div>
              </div>
            </div>

            <div className="pane-right subnet-grid-container">
              <div className="vpc-box">
                <div className="vpc-title">VPC (AWS ap-south-1 Mumbai)</div>
                <div className="igw-box">Internet Gateway (IGW) ◄──► NLB Load Balancer</div>
                
                <div className="subnet-row">
                  <div className="subnet-card public">
                    <div className="subnet-title">Public Subnet AZ1</div>
                    <div className="subnet-node">NAT Gateway 1</div>
                    <div className="subnet-node envoy">Envoy Route Proxy</div>
                  </div>
                  <div className="subnet-card public">
                    <div className="subnet-title">Public Subnet AZ2</div>
                    <div className="subnet-node">NAT Gateway 2</div>
                    <div className="subnet-node envoy">Envoy Route Proxy</div>
                  </div>
                </div>

                <div className="subnet-row">
                  <div className="subnet-card private">
                    <div className="subnet-title">Private Subnet AZ1 (Worker Nodes)</div>
                    <div className="node-pod">NestJS API Pod</div>
                    <div className="node-pod frontend">Therapist SPA Pod</div>
                    <div className="node-pod redis">Redis Pod</div>
                  </div>
                  <div className="subnet-card private">
                    <div className="subnet-title">Private Subnet AZ2 (Worker Nodes)</div>
                    <div className="node-pod">NestJS API Pod</div>
                    <div className="node-pod frontend">Client SPA Pod</div>
                    <div className="node-pod redis">Redis Pod</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Architecture Decisions (ADRs) */}
        {activeTab === 'adr' && (
          <div className="tab-pane-container full-width">
            <h2>Architecture Decision Records (ADRs)</h2>
            <p className="pane-intro">Log of non-negotiable architectural agreements shaping the development of the Emotist ecosystem.</p>

            <table className="adr-table">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Decision Topic</th>
                  <th>Status</th>
                  <th>Context & Rationale</th>
                  <th>Core Consequences</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>ADR-01</strong></td>
                  <td>Use Domain-Driven Design (DDD)</td>
                  <td><span className="adr-status approved"><CheckCircle2 size={12} /> Accepted</span></td>
                  <td>System handles distinct modules (therapist onboarding, appointments, client logs) with unique lifecycles.</td>
                  <td>Prevents code leakage. Organizes code into Therapist, Client, and Appointment contexts.</td>
                </tr>
                <tr>
                  <td><strong>ADR-02</strong></td>
                  <td>Adopt Clean Layered Architecture</td>
                  <td><span className="adr-status approved"><CheckCircle2 size={12} /> Accepted</span></td>
                  <td>Business rules must remain decoupled from database schemas and NestJS controllers framework.</td>
                  <td>High testability. Encapsulates dependencies, but increases initial folder files abstraction.</td>
                </tr>
                <tr>
                  <td><strong>ADR-03</strong></td>
                  <td>Event Outbox + CDC Communication</td>
                  <td><span className="adr-status approved"><CheckCircle2 size={12} /> Accepted</span></td>
                  <td>Guarantees database integrity and prevents connection lockouts during cross-context actions.</td>
                  <td>Supabase logs trigger EOC listeners, feeding events into BullMQ queues powered by Redis.</td>
                </tr>
                <tr>
                  <td><strong>ADR-04</strong></td>
                  <td>Razorpay Test checkout sandbox</td>
                  <td><span className="adr-status approved"><CheckCircle2 size={12} /> Accepted</span></td>
                  <td>Requires billing simulators for testing appointment payments without actual credit charges.</td>
                  <td>Runs custom checkouts forms on ports 3500/3501, simulating signatures HMAC checks.</td>
                </tr>
                <tr>
                  <td><strong>ADR-05</strong></td>
                  <td>Centralized Presets Component Library</td>
                  <td><span className="adr-status approved"><CheckCircle2 size={12} /> Accepted</span></td>
                  <td>Therapist portal, client portal, and mobile apps need consistent visuals, buttons, and spacing.</td>
                  <td>Created `@therapeutic/react-components` and `@therapeutic/utils` packages under workspaces.</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};
