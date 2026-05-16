function formatDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateTime(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  pending_approval: 'Pending Approval',
  completed: 'Completed',
  for_return: 'For Return',
};

const STATUS_COLORS = {
  scheduled: '#6B7280',
  checked_in: '#3B82F6',
  checked_out: '#F59E0B',
  pending_approval: '#F59E0B',
  completed: '#10B981',
  for_return: '#EF4444',
};

// logoBase64: optional base64 string of the logo image (no data URI prefix needed)
export function generateWorkOrderHTML(job, notes = [], logoBase64 = null) {
  const {
    jobNumber, description, client, trips = [],
    technicianName, createdAt,
  } = job;

  const logoHTML = logoBase64
    ? `<img src="data:image/png;base64,${logoBase64}" style="height:60px;max-width:180px;object-fit:contain;mix-blend-mode:multiply;" />`
    : `<div style="font-size:22px;font-weight:800;color:#1A3A6B;letter-spacing:1px;">ITFORP</div>`;

  const tripsHTML = (trips ?? []).map((trip) => {
    const tripNotes = (notes ?? []).filter((n) => n.tripNumber === trip.tripNumber);
    const statusColor = STATUS_COLORS[trip.status] ?? '#6B7280';
    const statusLabel = STATUS_LABELS[trip.status] ?? trip.status;

    const scopeLines = (trip.scopeOfWork ?? '')
      .split('\n')
      .filter(Boolean)
      .map((line) => `<li>${line}</li>`)
      .join('');

    const notesHTML = tripNotes.length
      ? tripNotes.map((n) => `
          <div class="note-item">
            <p class="note-text">${n.text ?? ''}</p>
            <p class="note-meta">${formatDateTime(n.createdAt)}</p>
          </div>`).join('')
      : '<p class="empty">No notes for this trip.</p>';

    return `
      <div class="trip-card">
        <div class="trip-header">
          <span class="trip-title">Trip ${trip.tripNumber}</span>
          <span class="trip-status" style="background:${statusColor}20;color:${statusColor};">${statusLabel}</span>
        </div>
        <table class="info-table">
          <tr><td class="info-label">Scheduled</td><td>${formatDateTime(trip.scheduledAt)}</td></tr>
        </table>
        ${scopeLines ? `
        <p class="sub-label">Scope of Work</p>
        <ul class="scope-list">${scopeLines}</ul>` : ''}
        <p class="sub-label">Notes</p>
        <div class="notes-block">${notesHTML}</div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 13px; color: #1F2937; background: #fff; }
  .page { max-width: 780px; margin: 0 auto; padding: 32px 28px; }

  /* Header */
  .doc-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1A3A6B; padding-bottom: 20px; margin-bottom: 24px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 26px; font-weight: 800; color: #1A3A6B; letter-spacing: 2px; }
  .doc-title p { font-size: 12px; color: #6B7280; margin-top: 4px; }
  .job-number { font-size: 15px; font-weight: 700; color: #1A3A6B; }

  /* Sections */
  .section { margin-bottom: 24px; }
  .section-title { font-size: 10px; font-weight: 700; color: #6B7280; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #E8ECF2; padding-bottom: 5px; }

  /* Info grid */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .info-item .label { font-size: 10px; font-weight: 600; color: #9BA5B4; text-transform: uppercase; letter-spacing: 0.8px; }
  .info-item .value { font-size: 13px; color: #1F2937; margin-top: 2px; font-weight: 500; }

  /* Trip cards */
  .trip-card { border: 1px solid #E8ECF2; border-radius: 10px; padding: 16px; margin-bottom: 14px; background: #F9FAFB; }
  .trip-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .trip-title { font-size: 14px; font-weight: 700; color: #1A3A6B; }
  .trip-status { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; letter-spacing: 0.5px; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .info-table td { padding: 3px 0; font-size: 12px; color: #4B5563; }
  .info-label { font-weight: 600; color: #9BA5B4; width: 110px; }
  .sub-label { font-size: 10px; font-weight: 700; color: #9BA5B4; text-transform: uppercase; letter-spacing: 1px; margin: 10px 0 6px; }
  .scope-list { padding-left: 18px; }
  .scope-list li { font-size: 12px; color: #374151; margin-bottom: 3px; }
  .notes-block { background: #fff; border-radius: 6px; padding: 10px; border: 1px solid #E8ECF2; }
  .note-item { padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid #F3F4F6; }
  .note-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .note-text { font-size: 12px; color: #374151; line-height: 1.5; }
  .note-meta { font-size: 10px; color: #9BA5B4; margin-top: 3px; }
  .empty { font-size: 12px; color: #9BA5B4; font-style: italic; }

  /* Signature */
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 8px; }
  .sig-block { }
  .sig-line { border-bottom: 1.5px solid #1F2937; margin-bottom: 6px; height: 40px; }
  .sig-label { font-size: 10px; color: #6B7280; letter-spacing: 0.5px; }

  /* Footer */
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E8ECF2; display: flex; justify-content: space-between; }
  .footer p { font-size: 10px; color: #9BA5B4; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="doc-header">
    <div>${logoHTML}</div>
    <div class="doc-title">
      <h1>WORK ORDER</h1>
      <p class="job-number"># ${jobNumber ?? '—'}</p>
      <p>Generated ${formatDate(new Date())}</p>
    </div>
  </div>

  <!-- Job Info -->
  <div class="section">
    <div class="section-title">Job Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="label">Client</div>
        <div class="value">${client?.name ?? '—'}</div>
      </div>
      ${client?.storeNumber ? `<div class="info-item">
        <div class="label">Store / Unit</div>
        <div class="value">${client.storeNumber}</div>
      </div>` : '<div></div>'}
      <div class="info-item" style="grid-column:1/-1;">
        <div class="label">Address</div>
        <div class="value">${client?.address ?? '—'}</div>
      </div>
      ${technicianName ? `<div class="info-item">
        <div class="label">Assigned Technician</div>
        <div class="value">${technicianName}</div>
      </div>` : ''}
      <div class="info-item">
        <div class="label">Created</div>
        <div class="value">${formatDate(createdAt)}</div>
      </div>
    </div>
  </div>

  <!-- Description -->
  ${description ? `
  <div class="section">
    <div class="section-title">Description</div>
    <p style="font-size:13px;color:#374151;line-height:1.6;">${description}</p>
  </div>` : ''}

  <!-- Trips -->
  <div class="section">
    <div class="section-title">Trips (${trips.length})</div>
    ${tripsHTML || '<p class="empty">No trips recorded.</p>'}
  </div>

  <!-- Signatures -->
  <div class="section">
    <div class="section-title">Acknowledgement &amp; Signatures</div>
    <div class="sig-grid">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Client Signature</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Date</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Technician / Admin Signature</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Date</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Confidential Work Order</p>
    <p>Job # ${jobNumber ?? '—'} · ${formatDate(new Date())}</p>
  </div>

</div>
</body>
</html>`;
}
