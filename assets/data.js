/* Reference data for the encoding standard.
   Cue weights: 8 = the code itself, 4-6 = a phrase only this module uses,
   1-2 = a supporting word that could belong to more than one module. */

const MODULES = [
  {
    id: 'CTN',
    name: 'Canteen',
    scope: 'Canteen',
    cues: [
      ['ctn', 8], ['canteen', 6], ['cafeteria', 5], ['kitchen', 2],
      ['meal', 2], ['food', 2], ['menu', 2], ['bawas', 1]
    ]
  },
  {
    id: 'ONEHRMS',
    name: 'OneHRMS',
    scope: 'Anything related to HR concerns (timekeeping, staff movement, employee profile, employment profile, etc.)',
    cues: [
      ['onehrms', 8], ['one hrms', 8], ['hrms', 6],
      ['timekeeping', 5], ['time keeping', 5], ['staff movement', 5],
      ['employee profile', 5], ['employment profile', 5], ['201 file', 5],
      ['sil', 4], ['dtr', 4], ['biometric', 4], ['payroll', 3], ['tardiness', 3],
      ['undertime', 3], ['overtime', 2], ['attendance', 3], ['regular employee', 2],
      ['leave credit', 3], ['schedule', 1], ['employee', 1]
    ]
  },
  {
    id: 'DPS',
    name: 'Due Process System',
    scope: 'Due Process System',
    cues: [
      ['dps', 8], ['due process', 6], ['notice to explain', 5], ['nte', 4],
      ['administrative case', 4], ['disciplinary', 4], ['infraction', 3],
      ['sanction', 3], ['memo', 1]
    ]
  },
  {
    id: 'ABS',
    name: 'Accommodation Booking System',
    scope: 'Accommodation Booking System',
    cues: [
      ['abs', 8], ['accommodation', 6], ['booking', 5], ['bookings', 5],
      ['staff house', 4], ['dormitory', 4], ['room reservation', 4],
      ['check-in', 2], ['lodging', 3], ['quarters', 3]
    ]
  },
  {
    id: 'HRGATEWAY',
    name: 'OneHRMS Gateway',
    scope: 'OneHRMS Gateway (leave, staffing requisitions before encoding movements)',
    cues: [
      ['hrgateway', 8], ['hr gateway', 8], ['gateway', 6],
      ['staffing requisition', 6], ['requisition', 4], ['manpower request', 4],
      ['leave filing', 5], ['leave application', 5], ['file a leave', 4],
      ['approver', 2], ['for approval', 1]
    ]
  },
  {
    id: 'OTP',
    name: 'ONEHR Talent Portfolio',
    scope: 'ONEHR Talent Portfolio (KPIs)',
    cues: [
      ['otp', 8], ['talent portfolio', 6], ['kpi', 5], ['kpis', 5],
      ['performance appraisal', 4], ['performance review', 4],
      ['scorecard', 3], ['competency', 3], ['rating period', 3]
    ]
  },
  {
    id: 'EEMS',
    name: 'Employee Exit Management System',
    scope: 'Employee Exit Management System',
    cues: [
      ['eems', 8], ['exit management', 6], ['exit interview', 5],
      ['clearance', 4], ['resignation', 4], ['offboarding', 4],
      ['separation', 4], ['final pay', 3], ['turnover', 2]
    ]
  },
  {
    id: 'TRS',
    name: 'Training Registrar System',
    scope: 'Training Registrar System',
    cues: [
      ['trs', 8], ['training registrar', 6], ['training', 4], ['seminar', 4],
      ['registrar', 4], ['course', 3], ['attendee', 3], ['enrollment', 3],
      ['certificate', 2], ['facilitator', 2]
    ]
  }
];

/* Department groups are for browsing only — the encoding standard lists the
   codes flat. Names are kept as written in the standard, title-cased to read. */
const DEPARTMENT_GROUPS = [
  {
    label: 'Corporate services',
    departments: [
      { id: 'CACA', name: 'Corporate Affairs and Compliance', cues: [['corporate affairs', 5], ['compliance', 3]] },
      { id: 'CAHR', name: 'Human Resource Management', cues: [['human resource', 5], ['hr department', 5], ['hrd', 4], ['cahr', 8], ['hr ', 2]] },
      { id: 'CAIT', name: 'Information Technology Department', cues: [['information technology', 5], ['it department', 5], ['mis', 3], ['cait', 8]] },
      { id: 'CALS', name: 'Legal Services, Enterprise Risk Management, Audit Group, and Data Protection and Management', cues: [['legal', 5], ['audit', 4], ['data protection', 4], ['enterprise risk', 4], ['cals', 8]] },
      { id: 'CAPS', name: 'Procurement and Shipping', cues: [['procurement', 5], ['shipping', 4], ['purchasing', 4], ['canvass', 3], ['caps', 8]] },
      { id: 'ACTG', name: 'Accounting', cues: [['accounting', 6], ['bookkeeping', 4], ['actg', 8]] },
      { id: 'TAX', name: 'Tax Compliance', cues: [['tax compliance', 6], ['bir', 4], ['withholding', 3]] },
      { id: 'TREA', name: 'Treasury', cues: [['treasury', 6], ['disbursement', 4], ['cashier', 3], ['trea', 8]] }
    ]
  },
  {
    label: 'Green operations',
    departments: [
      { id: 'GEAO', name: 'External Affairs and Operations', cues: [['external affairs', 5], ['geao', 8]] },
      { id: 'GOAG', name: 'Agronomy', cues: [['agronomy', 6], ['agronomist', 5], ['goag', 8]] },
      { id: 'GOCB', name: 'Broadleaf - FMA', cues: [['broadleaf', 6], ['fma', 4], ['gocb', 8]] },
      { id: 'GOPA', name: 'Precision Agriculture', cues: [['precision agriculture', 6], ['gopa', 8]] },
      { id: 'GOR1', name: 'GO Region I', cues: [['go region i', 6], ['region 1', 4], ['gor1', 8]] },
      { id: 'GOR2', name: 'GO Region II', cues: [['go region ii', 6], ['region 2', 4], ['gor2', 8]] },
      { id: 'GOSP', name: 'GO Special Projects', cues: [['special projects', 5], ['gosp', 8]] },
      { id: 'GOST', name: 'GO Strata', cues: [['strata', 5], ['gost', 8]] },
      { id: 'GROW', name: 'Growing', cues: [['growing', 5], ['grow ', 3]] },
      { id: 'GRTF', name: 'GO Recruitment Task Force', cues: [['recruitment task force', 6], ['task force', 3], ['grtf', 8]] }
    ]
  },
  {
    label: 'Manufacturing and plant',
    departments: [
      { id: 'SSDG', name: 'Systems and Standards Development Group', cues: [['systems and standards', 6], ['ssdg', 8]] },
      { id: 'EHSS', name: 'Environment, Health, Safety and Security', cues: [['safety', 4], ['security', 3], ['environment', 3], ['ehss', 8]] },
      { id: 'ENGG', name: 'Engineering', cues: [['engineering', 6], ['maintenance', 3], ['engg', 8]] },
      { id: 'FGR1', name: 'Finished Goods I', cues: [['finished goods i', 6], ['fgr1', 8]] },
      { id: 'FGR2', name: 'Finished Goods II', cues: [['finished goods ii', 6], ['fgr2', 8]] },
      { id: 'GLLO', name: 'Green Leaf Logistics', cues: [['green leaf logistics', 6], ['logistics', 3], ['gllo', 8]] },
      { id: 'IPR1', name: 'Production I', cues: [['production i', 6], ['ipr1', 8]] },
      { id: 'IPR2', name: 'Production II', cues: [['production ii', 6], ['ipr2', 8]] },
      { id: 'PROD', name: 'Production', cues: [['production', 4], ['prod ', 3]] },
      { id: 'QUCO', name: 'Quality Control', cues: [['quality control', 6], ['qc ', 3], ['quco', 8]] },
      { id: 'TRMG', name: 'Traffic Management Group', cues: [['traffic management', 6], ['dispatch', 3], ['trmg', 8]] }
    ]
  },
  {
    label: 'Leaf operations',
    departments: [
      { id: 'LOPS', name: 'Leaf Operations', cues: [['leaf operations', 5], ['lops', 8]] },
      { id: 'LOR1', name: 'Leaf Operations I', cues: [['leaf operations i', 6], ['lor1', 8]] },
      { id: 'LOR2', name: 'Leaf Operations II', cues: [['leaf operations ii', 6], ['lor2', 8]] }
    ]
  },
  {
    label: 'Commercial',
    departments: [
      { id: 'SALE', name: 'Sales', cues: [['sales', 5], ['sale ', 3], ['customer', 2]] }
    ]
  }
];

const DEPARTMENTS = DEPARTMENT_GROUPS.flatMap(g => g.departments.map(d => ({ ...d, group: g.label })));

const TYPES = [
  {
    id: 'SUPPORT',
    hint: 'A reported issue, correction, or request for help on a running system.',
    cues: [
      ['error', 4], ['bug', 4], ['not working', 4], ['hindi gumagana', 4], ['hindi ma', 3],
      ['cannot', 3], ['can not', 3], ["can't", 3], ['issue', 3], ['problem', 3],
      ['failed', 3], ['stuck', 3], ['reset', 3], ['password', 3], ['cancel', 3],
      ['correction', 3], ['wrong', 3], ['incorrect', 3], ['missing', 2], ['bakit', 3],
      ['paki', 2], ['pakicheck', 3], ['pacheck', 3], ['pahelp', 3], ['pwede', 1], ['pede', 1],
      ['pending', 2], ['delayed', 2], ['duplicate', 3], ['sync', 2]
    ]
  },
  {
    id: 'INITIATIVE',
    hint: 'New or improved capability: a build, rollout, migration, or enhancement.',
    cues: [
      ['initiative', 8], ['enhancement', 6], ['enhance', 5], ['new feature', 6],
      ['feature request', 6], ['proposal', 5], ['propose', 4], ['rollout', 5],
      ['roll out', 5], ['deployment', 4], ['deploy', 4], ['implementation', 4],
      ['implement', 3], ['migration', 5], ['migrate', 4], ['upgrade', 4],
      ['automate', 5], ['automation', 5], ['improvement', 4], ['development', 4],
      ['uat', 5], ['pilot', 4], ['go-live', 5], ['go live', 5], ['phase', 2], ['revamp', 4]
    ]
  },
  {
    id: 'MEETING',
    hint: 'A scheduled discussion, walkthrough, or alignment session.',
    cues: [
      ['meeting', 8], ['meet ', 4], ['huddle', 6], ['agenda', 6], ['minutes', 5],
      ['pulong', 6], ['alignment', 4], ['kick-off', 5], ['kickoff', 5],
      ['walkthrough', 5], ['orientation', 5], ['conference', 4], ['zoom', 4],
      ['google meet', 6], ['ms teams', 5], ['presentation', 4], ['discussion', 4],
      ['discuss', 3], ['schedule a call', 5]
    ]
  }
];


/* Free-tier AI providers. Keys live in the browser only — see the AI panel.
   Model names move fast; both fields are editable in the UI. */
const AI_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google AI Studio (Gemini)',
    defaultModel: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    prefix: 'AIza',
    note: 'Free tier, no card required.'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultModel: 'google/gemini-2.0-flash-exp:free',
    keyUrl: 'https://openrouter.ai/keys',
    prefix: 'sk-or-',
    note: 'Models ending in :free cost nothing.'
  }
];
