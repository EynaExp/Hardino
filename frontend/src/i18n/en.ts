const en = {
  // Sidebar
  dashboard: 'Dashboard',
  newScan: 'New Scan',
  assets: 'Assets',
  settings: 'Settings',
  changePassword: 'Change password',
  logout: 'Logout',

  // Dashboard
  dashboardTitle: 'Dashboard',
  totalScans: 'Total Scans',
  completed: 'Completed',
  criticalFindings: 'Critical Findings',
  highFindings: 'High Findings',
  recentScans: 'Recent Scans',
  noScans: 'No scans yet. Click "New Scan" to start.',
  newScanBtn: '+ New Scan',

  // New Scan
  newScanTitle: 'New Hardening Scan',
  scanName: 'Scan name (optional)',
  targetHost: 'Target IP or hostname *',
  autoDetectOS: 'Auto-detect OS',
  sshCredentials: 'SSH Credentials',
  sshCredsHint: 'Credentials are used only for this scan and never stored on disk.',
  sshUsername: 'SSH Username *',
  sshPort: 'SSH Port',
  sshPassword: 'SSH Password',
  sshKeyPath: 'SSH Key Path (optional)',
  aiAnalysis: 'AI Analysis',
  aiAnalysisDesc: 'Use LLM to analyze and prioritize findings',
  aiDisabled: 'Report will be generated without LLM analysis (faster, no API key needed)',
  startScan: 'Start Scan',
  createOnly: 'Create Only',
  creating: 'Creating...',

  // Scan Detail
  findings: 'Findings',
  phases: 'Phases',
  agentSessions: 'Agent Sessions',
  report: 'Report',
  searchFindings: 'Search findings...',
  sortBySeverity: 'Sort by Severity',
  sortByCategory: 'Sort by Category',
  sortByID: 'Sort by ID',
  noFindings: 'No findings yet.',
  noFindingsMatch: 'No findings match your search.',
  remediation: 'Remediation',
  hardeningScore: 'Hardening Score',
  checksPassed: 'checks passed',
  aiAnalysisOff: 'AI Analysis Off',
  reportNotAvailable: 'Report not yet available.',

  // Assets
  assetsTitle: 'Assets',
  devices: 'devices',
  searchAssets: 'Search by IP, hostname, or OS...',
  noAssets: 'No assets found. Run a scan to discover devices.',
  host: 'Host',
  os: 'OS',
  score: 'Score',
  findingsCol: 'Findings',
  lastScan: 'Last Scan',
  actions: 'Actions',
  issues: 'issues',
  osInfo: 'OS Info',
  openPorts: 'Open Ports & Services',
  runningServices: 'Running Services',
  notes: 'Notes',
  addNotes: 'Add notes about this asset...',
  saveNotes: 'Save Notes',
  viewLastScan: 'View last scan',

  // Settings
  settingsTitle: 'Settings',
  llmProvider: 'LLM Provider',
  apiKey: 'API Key',
  baseUrl: 'Base URL',
  testConnection: 'Test Connection',
  active: 'Active',
  failed: 'Failed',
  saveSettings: 'Save Settings',
  saved: 'Saved!',

  // Login
  deviceHardening: 'Device Hardening Platform',
  signIn: 'Sign In',
  username: 'Username',
  password: 'Password',

  // Misc
  loading: 'Loading...',
  unknownTarget: 'Unknown target',
  created: 'Created',
};

export default en;
