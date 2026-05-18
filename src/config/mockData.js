export const MOCK_JOBS = [
  {
    id: 'job_001',
    jobNumber: '25S00101',
    status: 'in_progress',
    client: {
      name: 'ITFORP SYSTEMS',
      storeNumber: 'STORE #4421',
      address: '456 Commerce Ave, Dallas, TX 75201',
      lat: 32.7767,
      lng: -96.797,
      contacts: [
        { name: 'Mike Torres', role: 'Site Manager', phone: '214-555-0181' },
        { name: 'Sarah Kim', role: 'IT Coordinator', phone: '214-555-0192' },
      ],
    },
    description:
      'Server room rack installation. Mount 2U switch and patch panel. Run Cat6 to all 12 drops. Label all cables per spec sheet.',
    trips: [
      {
        id: 'trip_001_1',
        tripNumber: 1,
        scheduledAt: new Date('2025-12-20T09:00:00'),
        status: 'scheduled',
        scopeOfWork:
          'Mount 2U switch in rack position 14\nInstall patch panel in rack position 15\nRun Cat6 to drops 1-6\nLabel cables per spec',
      },
      {
        id: 'trip_001_2',
        tripNumber: 2,
        scheduledAt: new Date('2025-12-22T10:30:00'),
        status: 'scheduled',
        scopeOfWork:
          'Complete Cat6 runs for drops 7-12\nTest all connections with Fluke tester\nDocument test results and send to office',
      },
    ],
    attachments: [],
    nextTrip: new Date('2025-12-20T09:00:00'),
    createdAt: new Date('2025-12-10T08:00:00'),
  },
  {
    id: 'job_002',
    jobNumber: '25S00087',
    status: 'in_progress',
    client: {
      name: 'METRO RETAIL GROUP',
      storeNumber: 'STORE #0089',
      address: '789 Main St, Austin, TX 78701',
      lat: 30.2672,
      lng: -97.7431,
      contacts: [
        { name: 'James Wright', role: 'Facilities Director', phone: '512-555-0134' },
      ],
    },
    description:
      'POS system replacement across 8 checkout lanes. Replace terminals, card readers, and receipt printers.',
    trips: [
      {
        id: 'trip_002_1',
        tripNumber: 1,
        scheduledAt: new Date('2025-12-18T07:00:00'),
        status: 'completed',
        scopeOfWork:
          'Replace POS terminals in lanes 1-4\nInstall new card readers\nTest transaction flow on each lane',
      },
      {
        id: 'trip_002_2',
        tripNumber: 2,
        scheduledAt: new Date('2025-12-19T07:00:00'),
        status: 'scheduled',
        scopeOfWork:
          'Replace POS terminals in lanes 5-8\nReplace receipt printers\nFinal system test and sign-off',
      },
    ],
    attachments: [],
    nextTrip: new Date('2025-12-19T07:00:00'),
    createdAt: new Date('2025-12-05T09:00:00'),
  },
  {
    id: 'job_003',
    jobNumber: '25S00064',
    status: 'completed',
    client: {
      name: 'HIGHLAND MEDICAL CENTER',
      storeNumber: 'UNIT #B-12',
      address: '321 Healthcare Blvd, Houston, TX 77002',
      lat: 29.7604,
      lng: -95.3698,
      contacts: [
        { name: 'Dr. Patricia Reed', role: 'IT Director', phone: '713-555-0145' },
        { name: 'Carlos Mendez', role: 'Network Admin', phone: '713-555-0156' },
      ],
    },
    description:
      'Wireless access point deployment for patient rooms on floors 3 and 4. 24 APs total with POE switch upgrade.',
    trips: [
      {
        id: 'trip_003_1',
        tripNumber: 1,
        scheduledAt: new Date('2025-11-15T08:00:00'),
        status: 'completed',
        scopeOfWork:
          'Install 12 APs on floor 3\nUpgrade POE switch in IDF-3\nConfigure SSIDs per network spec',
      },
      {
        id: 'trip_003_2',
        tripNumber: 2,
        scheduledAt: new Date('2025-11-20T08:00:00'),
        status: 'completed',
        scopeOfWork:
          'Install 12 APs on floor 4\nUpgrade POE switch in IDF-4\nFull site survey and coverage report',
      },
    ],
    attachments: [],
    nextTrip: null,
    createdAt: new Date('2025-11-01T10:00:00'),
  },
  {
    id: 'job_004',
    jobNumber: '25S00051',
    status: 'completed',
    client: {
      name: 'CENTRAL BANK CORP',
      storeNumber: 'BRANCH #017',
      address: '555 Financial Dr, San Antonio, TX 78205',
      lat: 29.4241,
      lng: -98.4936,
      contacts: [
        { name: 'Robert Chang', role: 'Branch Manager', phone: '210-555-0167' },
      ],
    },
    description:
      'ATM network upgrade and security camera replacement. 4 ATM machines and 16 HD cameras.',
    trips: [
      {
        id: 'trip_004_1',
        tripNumber: 1,
        scheduledAt: new Date('2025-10-28T06:00:00'),
        status: 'completed',
        scopeOfWork: 'Upgrade network on all 4 ATMs\nReplace 16 security cameras\nTest all feeds',
      },
    ],
    attachments: [],
    nextTrip: null,
    createdAt: new Date('2025-10-15T08:00:00'),
  },
  {
    id: 'job_005',
    jobNumber: '25S00112',
    status: 'in_progress',
    client: {
      name: 'NEXUS LOGISTICS CO.',
      storeNumber: 'WAREHOUSE #3',
      address: '1800 Industrial Pkwy, Fort Worth, TX 76102',
      lat: 32.7555,
      lng: -97.3308,
      contacts: [
        { name: 'Angela Foster', role: 'Operations Manager', phone: '817-555-0221' },
        { name: 'Derek Simmons', role: 'IT Lead', phone: '817-555-0243' },
      ],
    },
    description:
      'Structured cabling installation for new warehouse expansion. 48 data drops, 2 IDFs, and fiber backbone between buildings.',
    trips: [
      {
        id: 'trip_005_1',
        tripNumber: 1,
        scheduledAt: new Date('2026-05-20T07:30:00'),
        status: 'scheduled',
        scopeOfWork:
          'Install IDF-A enclosure and patch panel\nRun fiber backbone between Building A and B\nTest fiber with OTDR',
      },
      {
        id: 'trip_005_2',
        tripNumber: 2,
        scheduledAt: new Date('2026-05-22T07:30:00'),
        status: 'scheduled',
        scopeOfWork:
          'Pull Cat6 for drops 1-24 in Building A\nTerminate and test all drops\nLabel per TIA-606 standard',
      },
      {
        id: 'trip_005_3',
        tripNumber: 3,
        scheduledAt: new Date('2026-05-27T07:30:00'),
        status: 'scheduled',
        scopeOfWork:
          'Pull Cat6 for drops 25-48 in Building B\nInstall IDF-B and patch panel\nFinal test and certification report',
      },
    ],
    attachments: [],
    nextTrip: new Date('2026-05-20T07:30:00'),
    createdAt: new Date('2026-05-10T08:00:00'),
  },
];

export const MOCK_NOTES = {
  job_001: [
    {
      id: 'note_001_1',
      tripId: 'trip_001_1',
      tripNumber: 1,
      author: 'ASD Dispatch',
      text: 'Job confirmed. Site contact will meet tech at loading dock.',
      createdAt: new Date('2025-12-10T09:00:00'),
    },
    {
      id: 'note_001_2',
      tripId: 'trip_001_1',
      tripNumber: 1,
      author: 'Tech - John Ramirez',
      text: 'On site. Rack space confirmed, starting install.',
      createdAt: new Date('2025-12-20T09:15:00'),
    },
  ],
  job_002: [
    {
      id: 'note_002_1',
      tripId: 'trip_002_1',
      tripNumber: 1,
      author: 'ASD Dispatch',
      text: 'Trip 1 complete. Lanes 1-4 operational.',
      createdAt: new Date('2025-12-18T14:30:00'),
    },
  ],
  job_003: [
    {
      id: 'note_003_1',
      tripId: 'trip_003_1',
      tripNumber: 1,
      author: 'ASD Dispatch',
      text: 'Floor 3 install complete. All APs online.',
      createdAt: new Date('2025-11-15T16:00:00'),
    },
    {
      id: 'note_003_2',
      tripId: 'trip_003_2',
      tripNumber: 2,
      author: 'ASD Dispatch',
      text: 'Job has been completed. Coverage report sent to client.',
      createdAt: new Date('2025-11-20T15:45:00'),
    },
  ],
  job_004: [
    {
      id: 'note_004_1',
      tripId: 'trip_004_1',
      tripNumber: 1,
      author: 'ASD Dispatch',
      text: 'Job complete. All ATMs and cameras operational. Sign-off received.',
      createdAt: new Date('2025-10-28T12:00:00'),
    },
  ],
  job_005: [
    {
      id: 'note_005_1',
      tripId: 'trip_005_1',
      tripNumber: 1,
      author: 'ASD Dispatch',
      text: 'Job created. Site contact Angela will provide dock access. Confirm arrival window 24hrs before.',
      createdAt: new Date('2026-05-10T08:30:00'),
    },
  ],
};
