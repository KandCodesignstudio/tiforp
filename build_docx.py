from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

doc = Document()

# ── Page margins ──
for section in doc.sections:
    section.page_width  = Inches(8.5)
    section.page_height = Inches(11)
    section.left_margin   = Inches(1.0)
    section.right_margin  = Inches(1.0)
    section.top_margin    = Inches(1.0)
    section.bottom_margin = Inches(1.0)

# ── Brand colours ──
NAVY   = RGBColor(0x1a, 0x1a, 0x2e)
BLUE   = RGBColor(0x4f, 0xc3, 0xf7)
DARK   = RGBColor(0x2d, 0x37, 0x48)
GRAY   = RGBColor(0x71, 0x82, 0x96)
WHITE  = RGBColor(0xff, 0xff, 0xff)
ORANGE = RGBColor(0xff, 0x8c, 0x00)
GREEN  = RGBColor(0x1a, 0x73, 0x48)

# ────────────────────────────────────────────────────────────────
# Helper utilities
# ────────────────────────────────────────────────────────────────

def set_cell_bg(cell, hex_color: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top','left','bottom','right','insideH','insideV'):
        tag = OxmlElement(f'w:{ edge }')
        for k, v in kwargs.items():
            tag.set(qn(f'w:{k}'), str(v))
        tcBorders.append(tag)
    tcPr.append(tcBorders)

def add_run(para, text, bold=False, italic=False, size=11,
            color=DARK, font_name='Calibri'):
    run = para.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.name = font_name
    return run

def add_heading(text, level=1, page_break_before=False):
    """Styled heading paragraph (not using built-in heading styles for portability)."""
    if page_break_before:
        # Add a page break paragraph first
        pb = doc.add_paragraph()
        run = pb.add_run()
        run.add_break(docx_break_type('page'))
        pb.paragraph_format.space_before = Pt(0)
        pb.paragraph_format.space_after  = Pt(0)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    if level == 1:
        add_run(p, text, bold=True, size=22, color=NAVY)
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after  = Pt(4)
    elif level == 2:
        add_run(p, text, bold=True, size=14, color=NAVY)
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after  = Pt(4)
    elif level == 3:
        add_run(p, text, bold=True, size=12, color=NAVY)
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after  = Pt(3)
    return p

def docx_break_type(kind):
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    br = OxmlElement('w:br')
    br.set(qn('w:type'), kind)
    return br  # not used directly — see add_page_break()

def add_page_break():
    p = doc.add_paragraph()
    run = p.add_run()
    br = OxmlElement('w:br')
    br.set(qn('w:type'), 'page')
    run._r.append(br)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after  = Pt(0)

def add_body(text, size=11, color=DARK, bold=False, italic=False, space_after=6):
    p = doc.add_paragraph()
    add_run(p, text, bold=bold, italic=italic, size=size, color=color)
    p.paragraph_format.space_after = Pt(space_after)
    return p

def add_bullet(text, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    if bold_prefix:
        add_run(p, bold_prefix, bold=True, size=11, color=DARK)
        add_run(p, text, size=11, color=DARK)
    else:
        add_run(p, text, size=11, color=DARK)
    p.paragraph_format.space_after = Pt(3)
    return p

def add_screenshot_placeholder(label, caption=''):
    """A shaded box with dashed border acting as a screenshot placeholder."""
    t = doc.add_table(rows=1, cols=1)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = t.cell(0, 0)
    set_cell_bg(cell, 'EBF5FF')

    # Dashed border
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        tag = OxmlElement(f'w:{edge}')
        tag.set(qn('w:val'), 'dashed')
        tag.set(qn('w:sz'), '12')
        tag.set(qn('w:space'), '0')
        tag.set(qn('w:color'), '4FC3F7')
        tcBorders.append(tag)
    tcPr.append(tcBorders)

    cell.width = Inches(6.0)

    # Camera emoji line
    p1 = cell.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_before = Pt(14)
    p1.paragraph_format.space_after  = Pt(4)
    add_run(p1, '📷', size=20, color=RGBColor(0x4f, 0xc3, 0xf7))

    # Label
    p2 = cell.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.space_after = Pt(3)
    add_run(p2, label, bold=True, size=11, color=RGBColor(0x2c, 0x6f, 0xa8))

    # Caption
    if caption:
        p3 = cell.add_paragraph()
        p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p3.paragraph_format.space_after = Pt(14)
        add_run(p3, caption, italic=True, size=9, color=GRAY)
    else:
        cell.paragraphs[-1].paragraph_format.space_after = Pt(14)

    # Spacer after table
    sp = doc.add_paragraph()
    sp.paragraph_format.space_after = Pt(8)
    return t

def add_two_screenshots(label1, cap1, label2, cap2):
    """Two placeholder boxes side-by-side using a 2-col table."""
    t = doc.add_table(rows=1, cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER

    for idx, (label, caption) in enumerate([(label1, cap1), (label2, cap2)]):
        cell = t.cell(0, idx)
        set_cell_bg(cell, 'EBF5FF')
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        tcBorders = OxmlElement('w:tcBorders')
        for edge in ('top', 'left', 'bottom', 'right'):
            tag = OxmlElement(f'w:{edge}')
            tag.set(qn('w:val'), 'dashed')
            tag.set(qn('w:sz'), '12')
            tag.set(qn('w:space'), '0')
            tag.set(qn('w:color'), '4FC3F7')
            tcBorders.append(tag)
        tcPr.append(tcBorders)

        p1 = cell.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p1.paragraph_format.space_before = Pt(10)
        p1.paragraph_format.space_after  = Pt(4)
        add_run(p1, '📷', size=16, color=RGBColor(0x4f, 0xc3, 0xf7))

        p2 = cell.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2.paragraph_format.space_after = Pt(3)
        add_run(p2, label, bold=True, size=10, color=RGBColor(0x2c, 0x6f, 0xa8))

        p3 = cell.add_paragraph()
        p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p3.paragraph_format.space_after = Pt(10)
        add_run(p3, caption, italic=True, size=9, color=GRAY)

    sp = doc.add_paragraph()
    sp.paragraph_format.space_after = Pt(8)
    return t

def add_info_box(text):
    t = doc.add_table(rows=1, cols=1)
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    cell = t.cell(0, 0)
    set_cell_bg(cell, 'E8F4FF')
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        tag = OxmlElement(f'w:{edge}')
        tag.set(qn('w:val'), 'single' if edge == 'left' else 'none')
        tag.set(qn('w:sz'), '24')
        tag.set(qn('w:space'), '0')
        tag.set(qn('w:color'), '4FC3F7')
        tcBorders.append(tag)
    tcPr.append(tcBorders)
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after  = Pt(6)
    add_run(p, text, size=10.5, color=RGBColor(0x1a, 0x52, 0x76))
    sp = doc.add_paragraph()
    sp.paragraph_format.space_after = Pt(6)

def add_section_divider():
    """A thin blue rule under a section title."""
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), '4FC3F7')
    pBdr.append(bottom)
    pPr.append(pBdr)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after  = Pt(10)

def add_workflow_step(num, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent  = Inches(0.2)
    p.paragraph_format.space_after  = Pt(4)
    add_run(p, f'  {num}.  ', bold=True, size=11, color=BLUE)
    add_run(p, text, size=11, color=DARK)

def add_status_table(headers, rows, col_widths=None):
    t = doc.add_table(rows=1+len(rows), cols=len(headers))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.LEFT

    # Header row
    hdr_row = t.rows[0]
    for i, h in enumerate(headers):
        cell = hdr_row.cells[i]
        set_cell_bg(cell, '1A1A2E')
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after  = Pt(4)
        add_run(p, h, bold=True, size=10, color=WHITE)

    # Data rows
    for ri, row in enumerate(rows):
        tr = t.rows[ri+1]
        bg = 'F0F7FF' if ri % 2 == 0 else 'FFFFFF'
        for ci, val in enumerate(row):
            cell = tr.cells[ci]
            set_cell_bg(cell, bg)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after  = Pt(3)
            bold = (ci == 0)
            add_run(p, val, bold=bold, size=10, color=DARK if not bold else NAVY)

    if col_widths:
        for i, w in enumerate(col_widths):
            for row in t.rows:
                row.cells[i].width = Inches(w)

    sp = doc.add_paragraph()
    sp.paragraph_format.space_after = Pt(10)
    return t

def eyebrow(text):
    p = doc.add_paragraph()
    add_run(p, text, bold=True, size=8.5, color=BLUE)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after  = Pt(0)

# ════════════════════════════════════════════════════════════════
# COVER PAGE
# ════════════════════════════════════════════════════════════════

# Blue background cover using a full-page table
cover_tbl = doc.add_table(rows=1, cols=1)
cover_cell = cover_tbl.cell(0, 0)
set_cell_bg(cover_cell, '1A1A2E')
cover_cell.width = Inches(6.5)

def cover_para(cell, text, size, bold=False, color=WHITE, align=WD_ALIGN_PARAGRAPH.CENTER,
               space_before=0, space_after=8, italic=False):
    p = cell.add_paragraph() if cell.paragraphs[0].text else cell.paragraphs[0]
    if cell.paragraphs[-1].text and len(cell.paragraphs) > 1:
        p = cell.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after  = Pt(space_after)
    add_run(p, text, bold=bold, italic=italic, size=size, color=color)
    return p

cp = cover_cell.paragraphs[0]
cp.paragraph_format.space_before = Pt(60)
cp.paragraph_format.space_after  = Pt(4)

p_badge = cp
p_badge.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(p_badge, 'PRODUCT FEATURE GUIDE  ·  VERSION 1.0', bold=True, size=8,
        color=RGBColor(0xa8, 0xc8, 0xff))

p_title = cover_cell.add_paragraph()
p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_title.paragraph_format.space_before = Pt(24)
p_title.paragraph_format.space_after  = Pt(4)
add_run(p_title, 'ITforP ', bold=True, size=42, color=WHITE)
add_run(p_title, 'CORE', bold=True, size=42, color=BLUE)

p_sub = cover_cell.add_paragraph()
p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_sub.paragraph_format.space_before = Pt(4)
p_sub.paragraph_format.space_after  = Pt(32)
add_run(p_sub, 'Field Technician Operations Platform', size=14,
        color=RGBColor(0xcc, 0xdd, 0xee))

p_desc = cover_cell.add_paragraph()
p_desc.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_desc.paragraph_format.space_before = Pt(0)
p_desc.paragraph_format.space_after  = Pt(48)
add_run(p_desc,
    'A complete mobile operations system connecting office administrators\n'
    'and field technicians — from job scheduling and dispatch to GPS\n'
    'check-in, photo documentation, digital approvals, and invoicing.',
    size=11, color=RGBColor(0xaa, 0xbb, 0xcc))

p_meta = cover_cell.add_paragraph()
p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_meta.paragraph_format.space_before = Pt(0)
p_meta.paragraph_format.space_after  = Pt(60)
add_run(p_meta, 'Platform: iOS & Android   ·   Backend: Supabase\n© 2026 ITFORP. All rights reserved.   ·   kandcodesignstudio.com',
        size=9, color=RGBColor(0x88, 0x99, 0xaa))

add_page_break()

# ════════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ════════════════════════════════════════════════════════════════

eyebrow('CONTENTS')
add_heading('Table of Contents', level=1)
add_section_divider()

toc_items = [
    ('01', 'Login & Authentication'),
    ('02', 'Jobs List'),
    ('03', 'Job Detail — Overview Tab'),
    ('04', 'Job Detail — Instructions Tab'),
    ('05', 'Job Detail — Attachments Tab'),
    ('06', 'Job Detail — Notes Tab'),
    ('07', 'Job Detail — Chat Tab'),
    ('08', 'Dashboard  (Admin)'),
    ('09', 'Calendar  (Admin)'),
    ('10', 'Create & Edit Jobs  (Admin)'),
    ('11', 'Notifications'),
    ('12', 'Profile'),
    ('13', 'Key Workflows'),
    ('14', 'Role Permissions Summary'),
]
for num, label in toc_items:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(5)
    add_run(p, f'{num}  ', bold=True, size=10, color=BLUE)
    add_run(p, label, size=11, color=DARK)

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 01 — LOGIN
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 01')
add_heading('Login & Authentication', level=1)
add_section_divider()

add_screenshot_placeholder('LOGIN SCREEN', 'The ITforP Core login screen with company branding')

add_bullet('Branded Login Screen — Displays the ITforP logo on a full-screen company-branded background. If the logo fails to load, a styled text fallback ("ITforP CORE") renders automatically.')
add_bullet('Secure Email & Password Login — Authenticated via Supabase Auth.')
add_bullet('Password Reset — Sends a reset link to the user\'s registered email.')
add_bullet('Sign Up — New technician accounts can be created from the login screen.')
add_bullet('Persistent Sessions — Users stay logged in between app launches. No re-login required on reopen.')

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 02 — JOBS LIST
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 02')
add_heading('Jobs List', level=1)
add_section_divider()

add_two_screenshots(
    'JOBS LIST — ADMIN VIEW', 'All jobs across all technicians, grouped by status',
    'JOBS LIST — TECHNICIAN VIEW', 'Technician sees only their assigned jobs'
)

add_heading('Role-Based Visibility', level=2)
add_bullet('Admins see every job in the system across all technicians.')
add_bullet('Technicians see only the jobs assigned to them — nothing more.')

add_heading('Status Sections', level=2)
add_body('Jobs are automatically sorted and grouped into labeled sections:')
add_status_table(
    ['Section', 'Description'],
    [
        ['Active',           'Jobs currently being worked on'],
        ['Pending Approval', 'Work submitted by tech, awaiting admin sign-off'],
        ['Scheduled',        'Upcoming jobs not yet started'],
        ['Completed',        'Fully finished and admin-approved jobs'],
        ['Closed',           'Archived / fully resolved jobs'],
    ],
    col_widths=[1.8, 4.2]
)

add_heading('Real-Time & Auto-Refresh', level=2)
add_bullet('Pull-to-Refresh — Swipe down to manually reload the list.')
add_bullet('Real-Time Updates — List automatically updates when any job changes via Supabase real-time subscriptions, with a 15-second polling fallback for reliability in poor network conditions.')
add_bullet('Auto-Refresh on Focus — Silently refreshes whenever the user returns from a job detail screen.')

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 03 — OVERVIEW TAB
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 03')
add_heading('Job Detail — Overview Tab', level=1)
add_section_divider()

add_two_screenshots(
    'OVERVIEW — JOB HEADER', 'Client info, address, and admin action buttons',
    'OVERVIEW — TRIP CARD', 'Trip card with status, schedule, and action button'
)
add_two_screenshots(
    'COLLAPSIBLE DESCRIPTION', 'Job description card expanded and collapsed',
    'COLLAPSIBLE SCOPE OF WORK', 'Trip scope of work toggled open'
)
add_screenshot_placeholder('RESCHEDULE REQUEST BANNER (ADMIN)', 'Orange banner alerting admin to a technician\'s reschedule request')

add_heading('Job Header', level=2)
add_bullet('Displays job number, client name, and full site address — tappable to open Maps for navigation.')
add_bullet('Collapsible Description Card — The job description section can be tapped to expand or collapse.')
add_bullet('Admin-only: Edit Job and Export Work Order PDF buttons appear at the top.')

add_heading('Trip Cards & Collapsible Sections', level=2)
add_bullet('Each job can have multiple trips (site visits). Every trip shows its number, scheduled date/time, assigned technician, and status badge.')
add_bullet('Collapsible Scope of Work — Each trip\'s scope section can be individually expanded or collapsed using a chevron toggle.')

add_heading('Trip Status Workflow', level=2)
add_body('The trip progresses through statuses via a single action button:')
add_status_table(
    ['Status', 'Button Label', 'Who Can Advance'],
    [
        ['Scheduled',        'Go En Route',          'Technician'],
        ['En Route',         'Check In',             'Technician'],
        ['Checked In',       'Check Out',            'Technician'],
        ['Checked Out',      'Submit for Approval',  'Technician'],
        ['Pending Approval', 'Approve / Complete',   'Admin'],
        ['Completed',        '—',                    '—'],
    ],
    col_widths=[1.8, 2.2, 2.0]
)

add_heading('GPS Check-In Verification', level=2)
add_body('When a technician taps Check In, the app reads their GPS location and compares it to the job site address. If they are more than 500 meters away, they receive a warning before the check-in is recorded.')

add_heading('Future Date Block & Reschedule Request Workflow', level=2)
add_info_box('If a trip is scheduled for a future date, technicians cannot tap "Go En Route." They must send a reschedule request, which the admin can approve with a single tap.')
add_bullet('The tech sees the scheduled date and a Send Request button.')
add_bullet('The request (with reason) is saved to the trip record and logged in event history.')
add_bullet('The admin sees an orange banner: "Reschedule Request from [technician name]."')
add_bullet('The admin taps the banner to reschedule to today (9:00 AM), or dismiss it.')
add_bullet('The technician receives a push notification when approved. Action is logged in event history.')

add_heading('Digital Signature Capture', level=2)
add_body('When submitting a trip for approval, the technician can capture a digital signature from the client directly on-screen using a finger or stylus.')

add_heading('Technician Star Rating', level=2)
add_body('After a trip is completed, admins can leave a star rating (1–5 stars) and written review for the technician. Ratings appear on job cards and the technician\'s profile.')

add_heading('Admin Trip Management', level=2)
add_bullet('Add new trips with a date, scope of work, and technician assignment')
add_bullet('Edit existing trip details (date, scope of work)')
add_bullet('Delete trips, assign or reassign technicians')

add_heading('Export Work Order PDF', level=2)
add_body('Admins can generate and share a professional PDF work order for any job with a single tap.')

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 04 — INSTRUCTIONS
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 04')
add_heading('Job Detail — Instructions Tab', level=1)
add_section_divider()

add_screenshot_placeholder('INSTRUCTIONS TAB', 'Trip selector chips and scope of work displayed as a bullet list')

add_bullet('Trip Selector — A horizontal row of chip tabs to switch between trips. Each chip shows the trip number and a color-coded status indicator.')
add_bullet('Scope of Work — Full scope text for the selected trip, displayed as a clean bullet-point list for easy on-site reference.')
add_bullet('Scheduled Date & Time — The confirmed date and time for the selected trip is shown at the top.')

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 05 — ATTACHMENTS
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 05')
add_heading('Job Detail — Attachments Tab', level=1)
add_section_divider()

add_two_screenshots(
    'ATTACHMENTS — PHOTO GRID', 'Grid of uploaded site photos',
    'ATTACHMENTS — FAB MENU', 'Camera, Photo Library, and Document options'
)

add_bullet('Trip-Based Organization — Attachments are organized per trip with a selector to switch between trips.')
add_bullet('Photo Grid — Uploaded images display in a responsive grid. Tap any image to view it full-screen.')
add_bullet('Document List — Non-image files (PDFs, Word docs) are listed with filename and file size.')
add_heading('Add Attachments', level=2)
add_bullet('Take Photo — Opens the device camera to capture a new photo instantly.')
add_bullet('Photo Library — Browse and select existing photos from the device.')
add_bullet('Document / File — Pick any file type from device storage.')
add_heading('Automatic Image Compression', level=2)
add_info_box('All photos are automatically resized and compressed before uploading — scaled to max 1,920 px at 75% JPEG quality. This reduces upload time and cloud storage costs with no visible quality loss.')
add_bullet('Delete Attachments — Long-press any attachment to delete it (with a confirmation prompt).')

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 06 — NOTES
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 06')
add_heading('Job Detail — Notes Tab', level=1)
add_section_divider()

add_screenshot_placeholder('NOTES TAB', 'Notes feed with trip filter and timestamped entries')

add_bullet('Trip-Filtered Notes — Notes can be filtered to show only those for a specific trip, or viewed all together.')
add_bullet('Add Notes — Any user with job access can add a timestamped note attributed to their name.')
add_bullet('Admin Notifications — When a technician adds a note, all admins receive a push notification. The author does not receive a self-notification.')

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 07 — CHAT
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 07')
add_heading('Job Detail — Chat Tab', level=1)
add_section_divider()

add_screenshot_placeholder('CHAT TAB', 'Real-time chat between technician and admin on a job')

add_bullet('Per-Job Chat Thread — Each job has its own dedicated conversation between the assigned technician(s) and admins.')
add_bullet('Real-Time Messaging — Messages appear instantly via Supabase real-time subscriptions.')
add_bullet('Message Attribution — Every message shows the sender\'s name and timestamp.')
add_bullet('No Notification Noise — Chat messages do not trigger push notifications, keeping the notification inbox focused on actionable job events.')

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 08 — DASHBOARD
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 08  ·  ADMIN ONLY')
add_heading('Dashboard', level=1)
add_section_divider()

add_two_screenshots(
    'DASHBOARD — STAT CARDS', 'KPI cards showing job counts at a glance',
    'DASHBOARD — TECHNICIAN LIST', 'Ranked technician workload section'
)

add_heading('Job Statistics Cards', level=2)
add_body('Real-time KPI cards give management an instant operations overview:')
add_status_table(
    ['Card', 'What It Shows'],
    [
        ['Total Jobs',       'All jobs in the system'],
        ['Active',           'Jobs currently in progress'],
        ['Pending Approval', 'Jobs awaiting admin sign-off'],
        ['Completed',        'Finished and approved jobs'],
        ['Closed',           'Fully archived jobs'],
        ['Unpaid',           'Completed jobs with outstanding client or tech payment'],
        ['This Month',       'New jobs created in the current calendar month'],
    ],
    col_widths=[1.8, 4.2]
)

add_heading('Technician Workload', level=2)
add_body('A ranked list of all technicians sorted by number of assigned jobs. Tap any technician to filter jobs to that person.')

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 09 — CALENDAR
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 09  ·  ADMIN ONLY')
add_heading('Calendar', level=1)
add_section_divider()

add_two_screenshots(
    'CALENDAR — MONTH VIEW', 'Monthly calendar with trip dots on scheduled dates',
    'CALENDAR — DAY DETAIL', 'Trips listed for a selected day'
)

add_bullet('Monthly Calendar View — Navigate month by month. Days with scheduled trips show colored indicator dots (up to 3, with +N overflow).')
add_bullet('Day Detail Panel — Tap any date to see all trips scheduled for that day with job number, client, trip number, and status badge.')
add_bullet('Tap to Open — Tap any trip in the day detail to navigate directly to that job\'s detail screen.')

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 10 — CREATE / EDIT
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 10  ·  ADMIN ONLY')
add_heading('Create & Edit Jobs', level=1)
add_section_divider()

add_two_screenshots(
    'CREATE JOB SCREEN', 'Admin entering new job details',
    'EDIT JOB SCREEN', 'Admin editing an existing job'
)

add_heading('Create Job Fields', level=2)
add_bullet('Job Number — Unique identifier for the job')
add_bullet('Title / Description — Brief summary of the work to be performed')
add_bullet('Client Name — The customer or company name')
add_bullet('Store / Unit Number — Location identifier (optional)')
add_bullet('Site Address — Full street address of the work location')
add_bullet('Custom Fields — Add any number of additional label/value pairs (e.g., PO Number, Contract ID, On-site Contact)')

add_heading('Additional Admin Tools', level=2)
add_bullet('Import Jobs (CSV) — Bulk-import jobs from a CSV file by mapping columns to job fields.')
add_bullet('Add Technician — Create new technician accounts directly from within the app.')

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 11 — NOTIFICATIONS
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 11')
add_heading('Notifications', level=1)
add_section_divider()

add_screenshot_placeholder('NOTIFICATIONS SCREEN', 'Notification inbox with unread count banner and individual entries')

add_bullet('In-App Inbox — All notifications are stored and accessible from the bell icon in the navigation bar.')
add_bullet('Unread Indicators — Unread items appear in bold. A banner shows the total unread count with a one-tap Mark All Read shortcut.')
add_bullet('Tap to Navigate — Tapping any notification opens the relevant job directly.')
add_bullet('Delete — Individual notifications can be deleted from the inbox.')

add_heading('Push Notification Events', level=2)
add_body('The following events trigger push notifications to relevant users:')
for event in ['Job status changes (en route, check-in, check-out)',
              'Job submitted for approval', 'Job approved / completed',
              'New notes added to a job', 'Reschedule request sent by technician',
              'Reschedule approved by admin']:
    add_bullet(event)

add_info_box('Smart Filtering: Users never receive notifications for their own actions. Admins are not notified when they personally update a job. Chat messages do not trigger push notifications.')

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 12 — PROFILE
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 12')
add_heading('Profile', level=1)
add_section_divider()

add_screenshot_placeholder('PROFILE SCREEN', 'User profile showing name, email, role, and logout option')

add_bullet('Account Information — Full name, email address, and role (Admin or Field Technician).')
add_bullet('Avatar — A circular avatar displays the user\'s initials.')
add_bullet('App Version — Shown at the bottom for easy reference during support calls.')
add_bullet('Logout — A confirmation dialog prevents accidental logouts.')

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 13 — KEY WORKFLOWS
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 13')
add_heading('Key Workflows', level=1)
add_section_divider()

add_heading('13.1 — Full Job Lifecycle (Technician View)', level=2)
steps = [
    'Job assigned by admin — technician receives push notification.',
    'Technician opens job in Jobs List → reviews scope in Instructions tab.',
    'Day of job: taps Go En Route  (blocked if future date — see 13.2).',
    'Arrives on site: taps Check In — GPS location is verified against site address.',
    'Completes work — uploads photos, adds notes, communicates via Chat.',
    'Taps Check Out — optionally captures client digital signature.',
    'Taps Submit for Approval — admin receives push notification.',
    'Admin reviews job, attachments & notes → taps Approve / Complete.',
    'Job moves to Completed — technician is notified.',
]
for i, s in enumerate(steps, 1):
    add_workflow_step(i, s)

doc.add_paragraph().paragraph_format.space_after = Pt(8)

add_heading('13.2 — Reschedule Request Workflow', level=2)
steps2 = [
    'Technician taps Go En Route on a future-dated trip — app blocks the action.',
    'App shows the scheduled date and a Send Request button.',
    'Technician enters a reason and submits — request saved to trip & event history.',
    'Admin receives push notification.',
    'Admin opens job — sees orange banner on the trip card.',
    'Admin taps banner → chooses Reschedule to Today (sets time to 9:00 AM).',
    'Technician receives push notification — trip is now ready to start.',
    'Action logged in Event History with timestamp and user attribution.',
]
for i, s in enumerate(steps2, 1):
    add_workflow_step(i, s)

doc.add_paragraph().paragraph_format.space_after = Pt(8)

add_heading('13.3 — Multi-Trip Jobs', level=2)
add_body('A single job can have multiple trips — useful for follow-up visits, phased projects, or warranty returns. Each trip has its own scope of work, scheduled date, assigned technician, attachments, notes, and status progression. Admins can add trips at any time from the Overview tab.')

add_heading('13.4 — Event History & Audit Trail', level=2)
add_body('Every significant action is automatically logged with a timestamp and user attribution:')
for event in ['Status changes', 'Check-in & check-out', 'Submission & approval',
              'Reschedule requests and approvals', 'Technician assignments/removals',
              'Notes added', 'Attachments uploaded']:
    add_bullet(event)

add_page_break()

# ════════════════════════════════════════════════════════════════
# SECTION 14 — PERMISSIONS
# ════════════════════════════════════════════════════════════════

eyebrow('SECTION 14')
add_heading('Role Permissions Summary', level=1)
add_section_divider()

add_status_table(
    ['Feature', 'Admin', 'Field Technician'],
    [
        ['View all jobs',                  '✅  All jobs',     '✅  Own jobs only'],
        ['Create / Edit jobs',             '✅',               '—'],
        ['Add / Edit / Delete trips',      '✅',               '—'],
        ['Assign technicians',             '✅',               '—'],
        ['Approve completed trips',        '✅',               '—'],
        ['Reschedule trips',               '✅',               'Request only'],
        ['Export PDF work orders',         '✅',               '—'],
        ['Dashboard & Calendar',           '✅',               '—'],
        ['Import jobs (CSV)',               '✅',               '—'],
        ['Add technician accounts',        '✅',               '—'],
        ['Leave star ratings',             '✅',               '—'],
        ['Advance trip status',            '—',                '✅'],
        ['GPS Check-In',                   '—',                '✅'],
        ['Upload photos & documents',      '✅',               '✅'],
        ['Add notes',                      '✅',               '✅'],
        ['Send chat messages',             '✅',               '✅'],
        ['View event history',             '✅',               '✅'],
    ],
    col_widths=[2.8, 1.7, 1.7]
)

# ════════════════════════════════════════════════════════════════
# FOOTER
# ════════════════════════════════════════════════════════════════

doc.add_paragraph()
p_foot = doc.add_paragraph()
p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_foot.paragraph_format.space_before = Pt(20)
add_run(p_foot, 'ITforP Core  ·  © 2026 ITFORP. All rights reserved.  ·  kandcodesignstudio.com',
        size=9, color=GRAY)

# ════════════════════════════════════════════════════════════════
# SAVE
# ════════════════════════════════════════════════════════════════

out = '/home/user/tiforp/ITforP_Core_Feature_Guide.docx'
doc.save(out)
print(f'Saved: {out}')
