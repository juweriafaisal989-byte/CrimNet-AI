export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export function riskLevelFromScore(score: number): RiskLevel {
  if (score <= 30) return "Low";
  if (score <= 60) return "Medium";
  if (score <= 80) return "High";
  return "Critical";
}

export type EntityType =
  | "Person"
  | "Phone Number"
  | "Bank Account"
  | "Location"
  | "Vehicle"
  | "Organization";

export interface CaseRecord {
  id: string;
  title: string;
  crimeType: string;
  location: string;
  date: string;
  status: "Open" | "Under Investigation" | "Closed" | "Cold";
  riskScore: number;
  description: string;
  entities: string[];
  persons: string[];
  locations: string[];
  transactions: { id: string; from: string; to: string; amount: string; date: string; flag: string }[];
  insights: { title: string; description: string; confidence: number; risk: RiskLevel }[];
}

export const cases: CaseRecord[] = [
  {
    id: "CN-2041",
    title: "Hawala Network — Cross-Border Fund Routing",
    crimeType: "Financial Fraud",
    location: "Mumbai, MH",
    date: "2026-08-14",
    status: "Under Investigation",
    riskScore: 92,
    description:
      "Layered remittances routed through 14 shell accounts across Mumbai, Surat and Dubai. Funds converge on a single beneficiary cluster within 48 hours of deposit, consistent with hawala settlement behaviour.",
    entities: ["Rakesh Menon", "AC-4471902238", "+91-98204-11872", "Vertex Exim Pvt Ltd", "Andheri East, Mumbai"],
    persons: ["Rakesh Menon", "Imran Qureshi", "Devika Rao"],
    locations: ["Andheri East, Mumbai", "Ring Road, Surat", "Deira, Dubai"],
    transactions: [
      { id: "TXN-88213", from: "AC-4471902238", to: "AC-9920114576", amount: "₹48,00,000", date: "2026-08-02", flag: "Structuring" },
      { id: "TXN-88240", from: "AC-9920114576", to: "AC-3310022891", amount: "₹47,10,000", date: "2026-08-02", flag: "Rapid pass-through" },
      { id: "TXN-88377", from: "AC-3310022891", to: "Vertex Exim Pvt Ltd", amount: "₹46,25,000", date: "2026-08-03", flag: "Shell beneficiary" },
    ],
    insights: [
      { title: "Layering chain detected", description: "Three-hop transfer chain completes in under 26 hours with 3.6% value erosion — classic layering signature.", confidence: 94, risk: "Critical" },
      { title: "Shell company beneficiary", description: "Vertex Exim Pvt Ltd shares a registered address with two dormant entities linked to case CN-1988.", confidence: 87, risk: "High" },
      { title: "Broker role inferred", description: "Rakesh Menon holds the highest betweenness centrality in this sub-network, indicating a broker position.", confidence: 91, risk: "Critical" },
    ],
  },
  {
    id: "CN-2038",
    title: "Interstate Vehicle Theft Ring",
    crimeType: "Organized Theft",
    location: "Gurugram, HR",
    date: "2026-07-29",
    status: "Open",
    riskScore: 78,
    description:
      "Seventeen high-end vehicles lifted from gated societies and re-registered using forged chassis documentation in two neighbouring states.",
    entities: ["HR-26-DQ-8841", "Sameer Tyagi", "Auto Zenith Garage", "Sector 44, Gurugram"],
    persons: ["Sameer Tyagi", "Balbir Singh", "Nafees Khan"],
    locations: ["Sector 44, Gurugram", "Bhiwadi Industrial Area", "Meerut Bypass"],
    transactions: [
      { id: "TXN-71190", from: "Auto Zenith Garage", to: "AC-5580192244", amount: "₹6,40,000", date: "2026-07-18", flag: "Cash deposit burst" },
    ],
    insights: [
      { title: "Repeat garage node", description: "Auto Zenith Garage appears in 4 unrelated theft complaints within 90 days.", confidence: 83, risk: "High" },
      { title: "Movement corridor", description: "Recovered vehicles cluster along the Gurugram–Bhiwadi–Meerut corridor.", confidence: 76, risk: "Medium" },
    ],
  },
  {
    id: "CN-2033",
    title: "Narcotics Distribution — Coastal Supply Line",
    crimeType: "Narcotics",
    location: "Panaji, GA",
    date: "2026-07-11",
    status: "Under Investigation",
    riskScore: 88,
    description:
      "Consignments moved through fishing vessels and stored in short-let apartments; distribution coordinated through burner SIM rotation every 9 days.",
    entities: ["+91-99873-40021", "Farhan Sheikh", "Baga Beach Road", "GA-03-KL-2210"],
    persons: ["Farhan Sheikh", "Anthony D'Souza", "Priyanka Naik"],
    locations: ["Baga Beach Road", "Vasco Port", "Margao Godown"],
    transactions: [
      { id: "TXN-66102", from: "AC-7712004453", to: "AC-1029384756", amount: "₹12,75,000", date: "2026-07-05", flag: "Round-figure transfers" },
    ],
    insights: [
      { title: "SIM rotation pattern", description: "Four handsets share an IMEI cluster with sequential SIM swaps every 8–10 days.", confidence: 89, risk: "High" },
      { title: "Port proximity cluster", description: "72% of geo-tagged contacts occur within 3 km of Vasco Port.", confidence: 81, risk: "High" },
    ],
  },
  {
    id: "CN-2029",
    title: "Digital Arrest Scam Call Centre",
    crimeType: "Cyber Fraud",
    location: "Noida, UP",
    date: "2026-06-27",
    status: "Open",
    riskScore: 84,
    description:
      "Victims coerced via spoofed law-enforcement calls; proceeds converted to crypto within 4 hours through 31 mule accounts.",
    entities: ["+91-70420-99118", "AC-2231908877", "Nexa Support Solutions", "Sector 62, Noida"],
    persons: ["Vivek Chaudhary", "Ritika Sen", "Mohit Bansal"],
    locations: ["Sector 62, Noida", "Ghaziabad", "Jaipur"],
    transactions: [
      { id: "TXN-59044", from: "Victim Pool", to: "AC-2231908877", amount: "₹22,40,000", date: "2026-06-21", flag: "Mule aggregation" },
      { id: "TXN-59080", from: "AC-2231908877", to: "Crypto OTC Desk", amount: "₹21,90,000", date: "2026-06-21", flag: "Crypto off-ramp" },
    ],
    insights: [
      { title: "Mule fan-in structure", description: "31 accounts fan into 2 aggregator accounts — a textbook mule pyramid.", confidence: 96, risk: "Critical" },
      { title: "Script reuse", description: "Call transcripts match phrasing from case CN-1977 with 88% similarity.", confidence: 88, risk: "High" },
    ],
  },
  {
    id: "CN-2022",
    title: "Extortion Racket — Construction Sector",
    crimeType: "Extortion",
    location: "Pune, MH",
    date: "2026-06-09",
    status: "Cold",
    riskScore: 57,
    description:
      "Builders in three wards report protection demands routed through intermediaries; complainants retracted statements after threats.",
    entities: ["Suresh Kadam", "+91-98501-22334", "Hadapsar, Pune"],
    persons: ["Suresh Kadam", "Ganesh Pawar"],
    locations: ["Hadapsar, Pune", "Kharadi, Pune"],
    transactions: [],
    insights: [
      { title: "Witness attrition anomaly", description: "5 of 6 complainants withdrew within 11 days — statistically abnormal.", confidence: 72, risk: "Medium" },
    ],
  },
  {
    id: "CN-2015",
    title: "Counterfeit Currency Circulation",
    crimeType: "Counterfeiting",
    location: "Malda, WB",
    date: "2026-05-22",
    status: "Closed",
    riskScore: 34,
    description: "Circulation of FICN through border weekly markets; two printing setups seized, network largely dismantled.",
    entities: ["Abdul Hakim", "Malda Border Market"],
    persons: ["Abdul Hakim", "Sohail Mondal"],
    locations: ["Malda Border Market", "Kaliachak"],
    transactions: [],
    insights: [
      { title: "Network dismantled", description: "Post-arrest network density dropped 68%; residual nodes are low-value couriers.", confidence: 79, risk: "Low" },
    ],
  },
  {
    id: "CN-2009",
    title: "Human Trafficking Transit Route",
    crimeType: "Trafficking",
    location: "Siliguri, WB",
    date: "2026-05-03",
    status: "Under Investigation",
    riskScore: 95,
    description:
      "Recruitment through fake placement agencies; transit via rail with handlers rotating at three junctions.",
    entities: ["Bright Future Placements", "Lalita Devi", "Siliguri Junction", "+91-89100-77452"],
    persons: ["Lalita Devi", "Rana Pratap", "Jamal Ansari"],
    locations: ["Siliguri Junction", "Katihar", "Delhi Sarai Rohilla"],
    transactions: [
      { id: "TXN-40119", from: "Bright Future Placements", to: "AC-6621093344", amount: "₹3,20,000", date: "2026-04-28", flag: "Recruiter payout" },
    ],
    insights: [
      { title: "Agency front confirmed", description: "Placement agency has zero verifiable employer contracts across 3 years of filings.", confidence: 93, risk: "Critical" },
      { title: "Handler rotation", description: "Three handler identities alternate on a fixed 6-day cycle across the corridor.", confidence: 85, risk: "High" },
    ],
  },
  {
    id: "CN-2003",
    title: "Insurance Claim Syndicate",
    crimeType: "Financial Fraud",
    location: "Hyderabad, TS",
    date: "2026-04-17",
    status: "Open",
    riskScore: 66,
    description: "Staged accident claims filed through a repeating cluster of garages, clinics and surveyors.",
    entities: ["Dr. Mahesh Reddy", "Skyline Motors", "AC-1189224400"],
    persons: ["Dr. Mahesh Reddy", "Kiran Varma"],
    locations: ["Kukatpally, Hyderabad", "Secunderabad"],
    transactions: [
      { id: "TXN-33217", from: "Insurer Payout", to: "AC-1189224400", amount: "₹9,85,000", date: "2026-04-10", flag: "Repeat payee" },
    ],
    insights: [
      { title: "Surveyor collusion", description: "One surveyor signs 41% of all flagged claims in the cluster.", confidence: 84, risk: "High" },
    ],
  },
];

export interface EntityRecord {
  id: string;
  name: string;
  type: EntityType;
  connections: number;
  cases: string[];
  riskScore: number;
  aliases?: string[];
  firstSeen: string;
  lastSeen: string;
  notes: string;
  suspiciousActivities: string[];
  riskFactors: { factor: string; weight: number; detail: string }[];
  relationships: { target: string; type: RelationType; detail: string }[];
}

export type RelationType =
  | "KNOWS"
  | "CALLED"
  | "TRANSFERRED_MONEY_TO"
  | "ASSOCIATED_WITH"
  | "LOCATED_AT"
  | "INVOLVED_IN";

export const entities: EntityRecord[] = [
  {
    id: "E-001",
    name: "Rakesh Menon",
    type: "Person",
    connections: 27,
    cases: ["CN-2041", "CN-2003"],
    riskScore: 94,
    aliases: ["R. Menon", "Rocky"],
    firstSeen: "2024-11-02",
    lastSeen: "2026-08-30",
    notes: "Suspected hawala broker operating between Mumbai and Gulf corridors.",
    suspiciousActivities: [
      "9 structured deposits under reporting threshold in 11 days",
      "Contacted 4 flagged mule account holders within 1 hour of payout",
      "Travelled to Dubai 6 times in 8 months with no declared business",
    ],
    riskFactors: [
      { factor: "Central position in network", weight: 30, detail: "Highest betweenness centrality (0.41) across the active graph." },
      { factor: "Connections to high-risk entities", weight: 26, detail: "Linked to 7 entities scoring above 80." },
      { factor: "Unusual transactions", weight: 22, detail: "Pass-through velocity of 26 hours across three hops." },
      { factor: "Multiple case involvement", weight: 16, detail: "Named in 2 active investigations." },
    ],
    relationships: [
      { target: "Imran Qureshi", type: "KNOWS", detail: "Co-located at 3 meetings in Andheri East" },
      { target: "AC-4471902238", type: "TRANSFERRED_MONEY_TO", detail: "₹48,00,000 on 2026-08-02" },
      { target: "Vertex Exim Pvt Ltd", type: "ASSOCIATED_WITH", detail: "Signatory on two dormant accounts" },
      { target: "+91-98204-11872", type: "CALLED", detail: "212 calls in 60 days" },
    ],
  },
  {
    id: "E-002",
    name: "+91-98204-11872",
    type: "Phone Number",
    connections: 41,
    cases: ["CN-2041"],
    riskScore: 88,
    firstSeen: "2025-09-14",
    lastSeen: "2026-09-01",
    notes: "Burner SIM registered on forged ID; heavy late-night traffic.",
    suspiciousActivities: [
      "78% of calls placed between 01:00 and 04:00",
      "IMEI shared with two other flagged SIMs",
    ],
    riskFactors: [
      { factor: "Number of suspicious connections", weight: 34, detail: "Contacts 12 entities already flagged high risk." },
      { factor: "Unusual activity pattern", weight: 28, detail: "Nocturnal call distribution far outside population baseline." },
      { factor: "Identity mismatch", weight: 26, detail: "Registered ID failed verification against issuing authority." },
    ],
    relationships: [
      { target: "Rakesh Menon", type: "ASSOCIATED_WITH", detail: "Primary handset in use" },
      { target: "Imran Qureshi", type: "CALLED", detail: "96 calls, avg duration 42s" },
    ],
  },
  {
    id: "E-003",
    name: "AC-4471902238",
    type: "Bank Account",
    connections: 19,
    cases: ["CN-2041"],
    riskScore: 91,
    firstSeen: "2025-12-01",
    lastSeen: "2026-08-14",
    notes: "Current account with turnover 38x declared income.",
    suspiciousActivities: [
      "₹48L transferred out within 3 hours of credit",
      "Beneficiary list changed 6 times in one quarter",
    ],
    riskFactors: [
      { factor: "Unusual transactions", weight: 38, detail: "Turnover inconsistent with KYC profile." },
      { factor: "Rapid pass-through", weight: 32, detail: "Median hold time of 2h 40m." },
      { factor: "High-risk counterparties", weight: 21, detail: "5 of 9 counterparties flagged." },
    ],
    relationships: [
      { target: "AC-9920114576", type: "TRANSFERRED_MONEY_TO", detail: "₹47,10,000 on 2026-08-02" },
      { target: "Rakesh Menon", type: "ASSOCIATED_WITH", detail: "Authorised signatory" },
    ],
  },
  {
    id: "E-004",
    name: "Vertex Exim Pvt Ltd",
    type: "Organization",
    connections: 23,
    cases: ["CN-2041", "CN-2003"],
    riskScore: 86,
    firstSeen: "2025-03-19",
    lastSeen: "2026-08-22",
    notes: "Export firm with no verifiable shipping records for 2 fiscal years.",
    suspiciousActivities: ["Address shared with 2 dormant shells", "Nil GST filings against ₹4.1Cr inflow"],
    riskFactors: [
      { factor: "Shell indicators", weight: 36, detail: "No employees, no shipments, high inflow." },
      { factor: "Connection to high-risk entities", weight: 30, detail: "Direct edge to two critical-risk persons." },
      { factor: "Multiple case involvement", weight: 20, detail: "Appears in 2 investigations." },
    ],
    relationships: [
      { target: "Rakesh Menon", type: "ASSOCIATED_WITH", detail: "Beneficial owner (suspected)" },
      { target: "Andheri East, Mumbai", type: "LOCATED_AT", detail: "Registered office" },
    ],
  },
  {
    id: "E-005",
    name: "Imran Qureshi",
    type: "Person",
    connections: 18,
    cases: ["CN-2041"],
    riskScore: 79,
    firstSeen: "2025-06-08",
    lastSeen: "2026-08-27",
    notes: "Courier and settlement runner; frequent inter-city travel.",
    suspiciousActivities: ["Cash pickups logged at 5 locations in 3 days"],
    riskFactors: [
      { factor: "Connection to high-risk entities", weight: 32, detail: "Direct link to Rakesh Menon (94)." },
      { factor: "Number of suspicious connections", weight: 27, detail: "6 flagged contacts." },
      { factor: "Travel anomalies", weight: 20, detail: "Movement pattern matches settlement runs." },
    ],
    relationships: [
      { target: "Rakesh Menon", type: "KNOWS", detail: "Long-standing association" },
      { target: "Andheri East, Mumbai", type: "LOCATED_AT", detail: "Frequent presence" },
    ],
  },
  {
    id: "E-006",
    name: "Andheri East, Mumbai",
    type: "Location",
    connections: 34,
    cases: ["CN-2041"],
    riskScore: 62,
    firstSeen: "2025-01-11",
    lastSeen: "2026-09-02",
    notes: "Hotspot with repeated co-location events among flagged entities.",
    suspiciousActivities: ["14 co-location events among high-risk persons in 60 days"],
    riskFactors: [
      { factor: "Repeat hotspot", weight: 34, detail: "Recurring meeting point across two cases." },
      { factor: "High-risk visitors", weight: 28, detail: "4 critical-risk entities geo-tagged here." },
    ],
    relationships: [
      { target: "Vertex Exim Pvt Ltd", type: "ASSOCIATED_WITH", detail: "Registered office premises" },
      { target: "Imran Qureshi", type: "ASSOCIATED_WITH", detail: "Recurring presence" },
    ],
  },
  {
    id: "E-007",
    name: "Sameer Tyagi",
    type: "Person",
    connections: 15,
    cases: ["CN-2038"],
    riskScore: 74,
    firstSeen: "2025-10-04",
    lastSeen: "2026-07-25",
    notes: "Suspected coordinator of vehicle lifting crews.",
    suspiciousActivities: ["Handled 4 vehicles later recovered with forged chassis plates"],
    riskFactors: [
      { factor: "Involvement in multiple incidents", weight: 30, detail: "Linked to 4 theft complaints." },
      { factor: "Connection to flagged garage", weight: 26, detail: "Direct edge to Auto Zenith Garage." },
    ],
    relationships: [
      { target: "Auto Zenith Garage", type: "ASSOCIATED_WITH", detail: "Repeat drop-off point" },
      { target: "HR-26-DQ-8841", type: "ASSOCIATED_WITH", detail: "Vehicle recovered in his custody" },
    ],
  },
  {
    id: "E-008",
    name: "HR-26-DQ-8841",
    type: "Vehicle",
    connections: 9,
    cases: ["CN-2038"],
    riskScore: 58,
    firstSeen: "2026-02-16",
    lastSeen: "2026-07-22",
    notes: "SUV with tampered chassis number; re-registered twice in 5 months.",
    suspiciousActivities: ["Toll pings across 3 states in 14 hours"],
    riskFactors: [
      { factor: "Document tampering", weight: 30, detail: "Chassis number altered." },
      { factor: "Movement anomaly", weight: 24, detail: "Implausible route timing." },
    ],
    relationships: [
      { target: "Sameer Tyagi", type: "ASSOCIATED_WITH", detail: "Last known driver" },
      { target: "Auto Zenith Garage", type: "LOCATED_AT", detail: "Serviced 3 times" },
    ],
  },
  {
    id: "E-009",
    name: "Auto Zenith Garage",
    type: "Organization",
    connections: 21,
    cases: ["CN-2038"],
    riskScore: 71,
    firstSeen: "2025-08-30",
    lastSeen: "2026-07-28",
    notes: "Garage repeatedly appearing across unrelated theft complaints.",
    suspiciousActivities: ["Cash deposits of ₹6.4L with no matching invoices"],
    riskFactors: [
      { factor: "Repeat node across cases", weight: 32, detail: "Appears in 4 complaints in 90 days." },
      { factor: "Unusual transactions", weight: 25, detail: "Cash-only deposit bursts." },
    ],
    relationships: [
      { target: "Sameer Tyagi", type: "ASSOCIATED_WITH", detail: "Frequent customer" },
      { target: "Sector 44, Gurugram", type: "LOCATED_AT", detail: "Premises" },
    ],
  },
  {
    id: "E-010",
    name: "Farhan Sheikh",
    type: "Person",
    connections: 24,
    cases: ["CN-2033"],
    riskScore: 87,
    firstSeen: "2025-05-21",
    lastSeen: "2026-08-19",
    notes: "Coastal narcotics distribution coordinator.",
    suspiciousActivities: ["Burner rotation every 9 days", "Late-night port visits ×11"],
    riskFactors: [
      { factor: "Central position in network", weight: 30, detail: "Hub node in the coastal cluster." },
      { factor: "Unusual communication pattern", weight: 28, detail: "Device rotation to evade tracking." },
      { factor: "Connection to high-risk entities", weight: 22, detail: "5 critical-risk contacts." },
    ],
    relationships: [
      { target: "+91-99873-40021", type: "ASSOCIATED_WITH", detail: "Primary burner" },
      { target: "Vasco Port", type: "LOCATED_AT", detail: "11 night visits" },
    ],
  },
  {
    id: "E-011",
    name: "+91-99873-40021",
    type: "Phone Number",
    connections: 30,
    cases: ["CN-2033"],
    riskScore: 76,
    firstSeen: "2026-01-09",
    lastSeen: "2026-08-18",
    notes: "SIM in an IMEI cluster shared with three other flagged handsets.",
    suspiciousActivities: ["IMEI reuse across 4 SIMs"],
    riskFactors: [
      { factor: "Device sharing", weight: 32, detail: "IMEI cluster indicates coordinated evasion." },
      { factor: "Suspicious connections", weight: 26, detail: "Contacts 8 flagged entities." },
    ],
    relationships: [{ target: "Farhan Sheikh", type: "ASSOCIATED_WITH", detail: "Registered user" }],
  },
  {
    id: "E-012",
    name: "Vasco Port",
    type: "Location",
    connections: 17,
    cases: ["CN-2033"],
    riskScore: 55,
    firstSeen: "2025-11-30",
    lastSeen: "2026-08-18",
    notes: "Suspected consignment entry point.",
    suspiciousActivities: ["Unlogged vessel arrivals ×3"],
    riskFactors: [{ factor: "Repeat hotspot", weight: 30, detail: "72% of cluster contacts within 3km." }],
    relationships: [{ target: "Farhan Sheikh", type: "ASSOCIATED_WITH", detail: "Frequent visitor" }],
  },
  {
    id: "E-013",
    name: "Vivek Chaudhary",
    type: "Person",
    connections: 33,
    cases: ["CN-2029"],
    riskScore: 89,
    firstSeen: "2025-07-12",
    lastSeen: "2026-06-26",
    notes: "Operator of a spoofed law-enforcement call floor.",
    suspiciousActivities: ["Controls 31 mule accounts", "Crypto off-ramp within 4 hours of collection"],
    riskFactors: [
      { factor: "Number of suspicious connections", weight: 34, detail: "31 mule accounts fan in to his cluster." },
      { factor: "Unusual transactions", weight: 30, detail: "Fiat-to-crypto conversion inside 4 hours." },
      { factor: "Central position in network", weight: 20, detail: "Degree centrality 0.38." },
    ],
    relationships: [
      { target: "AC-2231908877", type: "TRANSFERRED_MONEY_TO", detail: "Aggregation account" },
      { target: "Nexa Support Solutions", type: "ASSOCIATED_WITH", detail: "Front company" },
    ],
  },
  {
    id: "E-014",
    name: "AC-2231908877",
    type: "Bank Account",
    connections: 36,
    cases: ["CN-2029"],
    riskScore: 93,
    firstSeen: "2026-01-22",
    lastSeen: "2026-06-25",
    notes: "Primary mule aggregation account.",
    suspiciousActivities: ["Fan-in from 31 accounts", "₹22.4L cycled in 6 hours"],
    riskFactors: [
      { factor: "Mule fan-in structure", weight: 38, detail: "31 inbound accounts, 2 outbound." },
      { factor: "Velocity anomaly", weight: 32, detail: "Full balance cycle in under 6 hours." },
    ],
    relationships: [{ target: "Vivek Chaudhary", type: "ASSOCIATED_WITH", detail: "Controller" }],
  },
  {
    id: "E-015",
    name: "Nexa Support Solutions",
    type: "Organization",
    connections: 14,
    cases: ["CN-2029"],
    riskScore: 72,
    firstSeen: "2025-09-02",
    lastSeen: "2026-06-24",
    notes: "Registered BPO used as a front for the call floor.",
    suspiciousActivities: ["Payroll for 8 staff against 40 active seats"],
    riskFactors: [{ factor: "Front company indicators", weight: 34, detail: "Seat count vs payroll mismatch." }],
    relationships: [{ target: "Vivek Chaudhary", type: "ASSOCIATED_WITH", detail: "Director" }],
  },
  {
    id: "E-016",
    name: "Lalita Devi",
    type: "Person",
    connections: 22,
    cases: ["CN-2009"],
    riskScore: 96,
    firstSeen: "2025-02-15",
    lastSeen: "2026-05-01",
    notes: "Recruiter operating through a placement agency front.",
    suspiciousActivities: ["Recruitment of 19 minors flagged", "Payouts from agency account"],
    riskFactors: [
      { factor: "Severity of offence pattern", weight: 40, detail: "Trafficking recruitment confirmed in 3 statements." },
      { factor: "Connection to high-risk entities", weight: 30, detail: "Direct link to handler cluster." },
      { factor: "Central position in network", weight: 22, detail: "Sole bridge between recruitment and transit clusters." },
    ],
    relationships: [
      { target: "Bright Future Placements", type: "ASSOCIATED_WITH", detail: "Proprietor" },
      { target: "Siliguri Junction", type: "LOCATED_AT", detail: "Transit handover point" },
    ],
  },
  {
    id: "E-017",
    name: "Bright Future Placements",
    type: "Organization",
    connections: 16,
    cases: ["CN-2009"],
    riskScore: 90,
    firstSeen: "2024-12-05",
    lastSeen: "2026-04-30",
    notes: "Placement agency with no verifiable employer contracts.",
    suspiciousActivities: ["Zero employer contracts over 3 years", "Recruiter payouts in cash"],
    riskFactors: [{ factor: "Front company indicators", weight: 38, detail: "No verifiable business activity." }],
    relationships: [{ target: "Lalita Devi", type: "ASSOCIATED_WITH", detail: "Proprietor" }],
  },
  {
    id: "E-018",
    name: "Siliguri Junction",
    type: "Location",
    connections: 12,
    cases: ["CN-2009"],
    riskScore: 49,
    firstSeen: "2025-03-08",
    lastSeen: "2026-05-01",
    notes: "Transit handover point on the trafficking corridor.",
    suspiciousActivities: ["Handler rotation observed on 6-day cycle"],
    riskFactors: [{ factor: "Corridor node", weight: 28, detail: "Consistent handover location." }],
    relationships: [{ target: "Lalita Devi", type: "ASSOCIATED_WITH", detail: "Recurring presence" }],
  },
  {
    id: "E-019",
    name: "Suresh Kadam",
    type: "Person",
    connections: 8,
    cases: ["CN-2022"],
    riskScore: 44,
    firstSeen: "2025-04-19",
    lastSeen: "2026-06-05",
    notes: "Alleged intermediary in construction-sector extortion.",
    suspiciousActivities: ["Contacted 3 complainants before retraction"],
    riskFactors: [{ factor: "Witness contact anomaly", weight: 26, detail: "Calls precede statement withdrawals." }],
    relationships: [{ target: "Hadapsar, Pune", type: "LOCATED_AT", detail: "Operating area" }],
  },
  {
    id: "E-020",
    name: "Dr. Mahesh Reddy",
    type: "Person",
    connections: 13,
    cases: ["CN-2003"],
    riskScore: 63,
    firstSeen: "2025-08-11",
    lastSeen: "2026-04-14",
    notes: "Clinician certifying injuries in staged-accident claims.",
    suspiciousActivities: ["Signed 41% of flagged claims in cluster"],
    riskFactors: [
      { factor: "Repeat certifier", weight: 30, detail: "Disproportionate share of flagged claims." },
      { factor: "Connection to flagged garage", weight: 22, detail: "Claims co-occur with Skyline Motors." },
    ],
    relationships: [{ target: "Skyline Motors", type: "ASSOCIATED_WITH", detail: "Co-occurring claims" }],
  },
  {
    id: "E-021",
    name: "Skyline Motors",
    type: "Organization",
    connections: 11,
    cases: ["CN-2003"],
    riskScore: 52,
    firstSeen: "2025-10-27",
    lastSeen: "2026-04-12",
    notes: "Repair shop repeatedly named in insurance claim cluster.",
    suspiciousActivities: ["Repeat payee on 9 claims"],
    riskFactors: [{ factor: "Repeat payee", weight: 26, detail: "Concentration of payouts." }],
    relationships: [{ target: "Dr. Mahesh Reddy", type: "ASSOCIATED_WITH", detail: "Claim pairing" }],
  },
  {
    id: "E-022",
    name: "Abdul Hakim",
    type: "Person",
    connections: 6,
    cases: ["CN-2015"],
    riskScore: 26,
    firstSeen: "2025-06-30",
    lastSeen: "2026-05-20",
    notes: "Courier in a dismantled counterfeit currency network.",
    suspiciousActivities: ["Two market handovers observed"],
    riskFactors: [{ factor: "Low residual activity", weight: 12, detail: "Network dismantled; minimal current signal." }],
    relationships: [{ target: "Malda Border Market", type: "LOCATED_AT", detail: "Handover point" }],
  },
];

export const suspiciousActivities = [
  { id: "SA-901", title: "₹48L pass-through in under 3 hours", entity: "AC-4471902238", case: "CN-2041", severity: "Critical" as RiskLevel, time: "2h ago" },
  { id: "SA-902", title: "31 mule accounts fan into single aggregator", entity: "AC-2231908877", case: "CN-2029", severity: "Critical" as RiskLevel, time: "5h ago" },
  { id: "SA-903", title: "IMEI shared across 4 rotating SIMs", entity: "+91-99873-40021", case: "CN-2033", severity: "High" as RiskLevel, time: "9h ago" },
  { id: "SA-904", title: "Toll pings across 3 states in 14 hours", entity: "HR-26-DQ-8841", case: "CN-2038", severity: "Medium" as RiskLevel, time: "14h ago" },
  { id: "SA-905", title: "Recruiter payout with no employer contract", entity: "Bright Future Placements", case: "CN-2009", severity: "High" as RiskLevel, time: "1d ago" },
  { id: "SA-906", title: "Five complainants withdrew within 11 days", entity: "Suresh Kadam", case: "CN-2022", severity: "Medium" as RiskLevel, time: "2d ago" },
];

export const crimeTypeDistribution = [
  { name: "Financial Fraud", value: 34 },
  { name: "Cyber Fraud", value: 27 },
  { name: "Narcotics", value: 19 },
  { name: "Organized Theft", value: 14 },
  { name: "Trafficking", value: 9 },
  { name: "Extortion", value: 7 },
];

export const monthlyActivity = [
  { month: "Mar", cases: 12, alerts: 41 },
  { month: "Apr", cases: 16, alerts: 55 },
  { month: "May", cases: 14, alerts: 48 },
  { month: "Jun", cases: 21, alerts: 72 },
  { month: "Jul", cases: 24, alerts: 88 },
  { month: "Aug", cases: 29, alerts: 103 },
];

// ---------- Graph data ----------
export type GraphNodeType =
  | "Suspect"
  | "Victim"
  | "Organization"
  | "Phone Number"
  | "Bank Account"
  | "Location";

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  riskScore: number;
  cases: string[];
  x: number;
  y: number;
  detail: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: RelationType;
  detail: string;
}

export const graphNodes: GraphNode[] = [
  { id: "n1", label: "Rakesh Menon", type: "Suspect", riskScore: 94, cases: ["CN-2041"], x: 480, y: 300, detail: "Suspected hawala broker; highest betweenness centrality." },
  { id: "n2", label: "Imran Qureshi", type: "Suspect", riskScore: 79, cases: ["CN-2041"], x: 300, y: 200, detail: "Settlement runner and courier." },
  { id: "n3", label: "+91-98204-11872", type: "Phone Number", riskScore: 88, cases: ["CN-2041"], x: 620, y: 180, detail: "Burner SIM, nocturnal traffic." },
  { id: "n4", label: "AC-4471902238", type: "Bank Account", riskScore: 91, cases: ["CN-2041"], x: 660, y: 400, detail: "Turnover 38x declared income." },
  { id: "n5", label: "Vertex Exim Pvt Ltd", type: "Organization", riskScore: 86, cases: ["CN-2041"], x: 470, y: 480, detail: "Shell exporter, nil filings." },
  { id: "n6", label: "Andheri East, Mumbai", type: "Location", riskScore: 62, cases: ["CN-2041"], x: 300, y: 430, detail: "Repeat meeting hotspot." },
  { id: "n7", label: "Devika Rao", type: "Victim", riskScore: 22, cases: ["CN-2041"], x: 820, y: 470, detail: "Reported defrauded remittance." },
  { id: "n8", label: "Vivek Chaudhary", type: "Suspect", riskScore: 89, cases: ["CN-2029"], x: 900, y: 220, detail: "Call floor operator." },
  { id: "n9", label: "AC-2231908877", type: "Bank Account", riskScore: 93, cases: ["CN-2029"], x: 1030, y: 350, detail: "Mule aggregation account." },
  { id: "n10", label: "Nexa Support Solutions", type: "Organization", riskScore: 72, cases: ["CN-2029"], x: 1000, y: 110, detail: "BPO front for scam operation." },
  { id: "n11", label: "+91-70420-99118", type: "Phone Number", riskScore: 68, cases: ["CN-2029"], x: 830, y: 90, detail: "Spoofing gateway line." },
  { id: "n12", label: "Farhan Sheikh", type: "Suspect", riskScore: 87, cases: ["CN-2033"], x: 220, y: 620, detail: "Coastal distribution coordinator." },
  { id: "n13", label: "+91-99873-40021", type: "Phone Number", riskScore: 76, cases: ["CN-2033"], x: 80, y: 520, detail: "IMEI cluster SIM." },
  { id: "n14", label: "Vasco Port", type: "Location", riskScore: 55, cases: ["CN-2033"], x: 120, y: 720, detail: "Consignment entry point." },
  { id: "n15", label: "Sameer Tyagi", type: "Suspect", riskScore: 74, cases: ["CN-2038"], x: 640, y: 660, detail: "Vehicle theft crew coordinator." },
  { id: "n16", label: "Auto Zenith Garage", type: "Organization", riskScore: 71, cases: ["CN-2038"], x: 800, y: 720, detail: "Repeat garage node." },
  { id: "n17", label: "Sector 44, Gurugram", type: "Location", riskScore: 41, cases: ["CN-2038"], x: 640, y: 810, detail: "Theft origin cluster." },
  { id: "n18", label: "Lalita Devi", type: "Suspect", riskScore: 96, cases: ["CN-2009"], x: 1080, y: 600, detail: "Trafficking recruiter." },
  { id: "n19", label: "Bright Future Placements", type: "Organization", riskScore: 90, cases: ["CN-2009"], x: 1200, y: 470, detail: "Placement agency front." },
  { id: "n20", label: "Siliguri Junction", type: "Location", riskScore: 49, cases: ["CN-2009"], x: 1210, y: 720, detail: "Transit handover point." },
  { id: "n21", label: "Anjali Prasad", type: "Victim", riskScore: 15, cases: ["CN-2009"], x: 980, y: 780, detail: "Rescued from transit route." },
  { id: "n22", label: "Mohit Bansal", type: "Suspect", riskScore: 66, cases: ["CN-2029"], x: 1150, y: 230, detail: "Mule account handler." },
];

export const graphEdges: GraphEdge[] = [
  { source: "n1", target: "n2", type: "KNOWS", detail: "Co-located at 3 meetings" },
  { source: "n1", target: "n3", type: "CALLED", detail: "212 calls in 60 days" },
  { source: "n1", target: "n4", type: "TRANSFERRED_MONEY_TO", detail: "₹48,00,000 on 2026-08-02" },
  { source: "n4", target: "n5", type: "TRANSFERRED_MONEY_TO", detail: "₹46,25,000 on 2026-08-03" },
  { source: "n1", target: "n5", type: "ASSOCIATED_WITH", detail: "Suspected beneficial owner" },
  { source: "n5", target: "n6", type: "LOCATED_AT", detail: "Registered office" },
  { source: "n2", target: "n6", type: "LOCATED_AT", detail: "Frequent presence" },
  { source: "n2", target: "n3", type: "CALLED", detail: "96 calls, avg 42s" },
  { source: "n7", target: "n4", type: "TRANSFERRED_MONEY_TO", detail: "Victim remittance ₹3,10,000" },
  { source: "n1", target: "n8", type: "ASSOCIATED_WITH", detail: "Two shared counterparties" },
  { source: "n8", target: "n9", type: "TRANSFERRED_MONEY_TO", detail: "₹22,40,000 aggregation" },
  { source: "n8", target: "n10", type: "ASSOCIATED_WITH", detail: "Director of front company" },
  { source: "n8", target: "n11", type: "CALLED", detail: "Spoofing gateway usage" },
  { source: "n22", target: "n9", type: "TRANSFERRED_MONEY_TO", detail: "Mule inflow ₹4,80,000" },
  { source: "n22", target: "n8", type: "KNOWS", detail: "Recruited handler" },
  { source: "n10", target: "n11", type: "ASSOCIATED_WITH", detail: "Registered lines" },
  { source: "n12", target: "n13", type: "ASSOCIATED_WITH", detail: "Primary burner handset" },
  { source: "n12", target: "n14", type: "LOCATED_AT", detail: "11 night visits" },
  { source: "n12", target: "n1", type: "ASSOCIATED_WITH", detail: "Indirect financial link (2 hops)" },
  { source: "n15", target: "n16", type: "ASSOCIATED_WITH", detail: "Repeat drop-off" },
  { source: "n16", target: "n17", type: "LOCATED_AT", detail: "Operating premises" },
  { source: "n15", target: "n17", type: "INVOLVED_IN", detail: "4 theft complaints" },
  { source: "n15", target: "n5", type: "TRANSFERRED_MONEY_TO", detail: "₹6,40,000 routed" },
  { source: "n18", target: "n19", type: "ASSOCIATED_WITH", detail: "Proprietor" },
  { source: "n18", target: "n20", type: "LOCATED_AT", detail: "Handover point" },
  { source: "n21", target: "n18", type: "KNOWS", detail: "Recruited victim" },
  { source: "n19", target: "n9", type: "TRANSFERRED_MONEY_TO", detail: "₹3,20,000 payout" },
  { source: "n18", target: "n22", type: "CALLED", detail: "17 calls in 3 weeks" },
];

// ---------- Analytics ----------
export const centralityRanking = [
  { name: "Rakesh Menon", type: "Suspect", degree: 27, betweenness: 0.41, pagerank: 0.092 },
  { name: "AC-2231908877", type: "Bank Account", degree: 36, betweenness: 0.34, pagerank: 0.088 },
  { name: "Vivek Chaudhary", type: "Suspect", degree: 33, betweenness: 0.31, pagerank: 0.081 },
  { name: "+91-98204-11872", type: "Phone Number", degree: 41, betweenness: 0.22, pagerank: 0.077 },
  { name: "Lalita Devi", type: "Suspect", degree: 22, betweenness: 0.29, pagerank: 0.071 },
  { name: "Farhan Sheikh", type: "Suspect", degree: 24, betweenness: 0.19, pagerank: 0.063 },
  { name: "Vertex Exim Pvt Ltd", type: "Organization", degree: 23, betweenness: 0.17, pagerank: 0.058 },
];

export interface AiInsight {
  title: string;
  description: string;
  confidence: number;
  risk: RiskLevel;
}

export const suspiciousDetections: AiInsight[] = [
  { title: "Three-hop layering chain", description: "₹48L moved across three accounts in 26 hours with 3.6% erosion — matches hawala settlement signature.", confidence: 94, risk: "Critical" },
  { title: "Mule fan-in pyramid", description: "31 accounts converge into 2 aggregators, then off-ramp to a crypto OTC desk within 4 hours.", confidence: 96, risk: "Critical" },
  { title: "Round-figure transfer cadence", description: "Seven transfers of exactly ₹1,25,000 at 9-day intervals between narcotics cluster accounts.", confidence: 82, risk: "High" },
  { title: "Cash deposit bursts without invoices", description: "Auto Zenith Garage deposits ₹6.4L in three tranches with no matching service records.", confidence: 77, risk: "Medium" },
];

export const hiddenConnections: AiInsight[] = [
  { title: "Menon ↔ Sheikh (2-hop bridge)", description: "No direct contact, but both settle through AC-3310022891 within the same 72-hour window.", confidence: 86, risk: "High" },
  { title: "Vertex Exim ↔ Skyline Motors", description: "Shared authorised signatory across two unrelated cases, surfaced by entity resolution.", confidence: 79, risk: "High" },
  { title: "Chaudhary ↔ Bright Future Placements", description: "Common payout account links the cyber fraud and trafficking clusters.", confidence: 74, risk: "Medium" },
  { title: "Tyagi ↔ Qureshi (device co-location)", description: "Handsets co-located at the same cell tower on 4 nights within 6 weeks.", confidence: 68, risk: "Medium" },
];

export const crimePatterns: AiInsight[] = [
  { title: "Metro-corridor financial cluster", description: "Financial fraud incidents concentrate along the Mumbai–Surat corridor with 61% shared counterparties.", confidence: 88, risk: "High" },
  { title: "Weekend narcotics movement", description: "84% of coastal consignment signals occur Friday 22:00 – Sunday 04:00.", confidence: 81, risk: "High" },
  { title: "Scam floor relocation cycle", description: "Call floors relocate every 47 days on average, always within 60 km of the previous site.", confidence: 76, risk: "Medium" },
  { title: "Theft-to-resale lag", description: "Median 9 days between vehicle theft and re-registration attempt.", confidence: 72, risk: "Medium" },
];

export const anomalies: AiInsight[] = [
  { title: "Transaction velocity outlier", description: "AC-4471902238 shows a 6.2σ deviation from its 90-day baseline hold time.", confidence: 92, risk: "Critical" },
  { title: "Nocturnal call concentration", description: "78% of calls on +91-98204-11872 fall between 01:00–04:00 versus a 9% baseline.", confidence: 90, risk: "High" },
  { title: "Implausible travel timing", description: "HR-26-DQ-8841 registers toll pings across three states in 14 hours.", confidence: 84, risk: "Medium" },
  { title: "Witness attrition spike", description: "Statement withdrawals in CN-2022 exceed the district norm by 4.1σ.", confidence: 71, risk: "Medium" },
];

export const anomalyTimeline = [
  { day: "Mon", score: 22, baseline: 18 },
  { day: "Tue", score: 31, baseline: 19 },
  { day: "Wed", score: 27, baseline: 18 },
  { day: "Thu", score: 58, baseline: 20 },
  { day: "Fri", score: 81, baseline: 21 },
  { day: "Sat", score: 94, baseline: 22 },
  { day: "Sun", score: 63, baseline: 19 },
];

export const riskDistribution = [
  { name: "Low", value: entities.filter((e) => riskLevelFromScore(e.riskScore) === "Low").length },
  { name: "Medium", value: entities.filter((e) => riskLevelFromScore(e.riskScore) === "Medium").length },
  { name: "High", value: entities.filter((e) => riskLevelFromScore(e.riskScore) === "High").length },
  { name: "Critical", value: entities.filter((e) => riskLevelFromScore(e.riskScore) === "Critical").length },
];

export const dashboardStats = {
  totalCases: cases.length + 34,
  totalPersons: 148,
  highRiskEntities: entities.filter((e) => e.riskScore > 60).length + 21,
  suspiciousConnections: 312,
};
