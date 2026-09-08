"""
Nokia Quality Task Tracker
RCA Template Generator v3
4-Level Cascade: L1 Reason → L2 Sub-Reason → L3 Root Cause → L4 Ownership
"""
import subprocess, sys
for pkg in ["openpyxl"]:
    try: __import__(pkg)
    except ImportError: subprocess.check_call([sys.executable, "-m", "pip", "install", pkg])

from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

# ==============================================================================
# MASTER DATA — 4-Level Cascade
# (L1_Reason, L2_SubReason, L3_RootCause_OperationalDefect, L4_Ownership, Notes)
# ==============================================================================
RCA_DATA = [

    # ══════════════════════════════════════════════════════════════════════════
    # L1: INSTALLATION DELAY (The Problem: Customer's installation is delayed)
    # ══════════════════════════════════════════════════════════════════════════

    ("Installation delay",
     "Delay in dispatching (Contractor / Field)",
     "Backoffice operations (Contractor)",
     "Contractor",
     "Contractor backoffice failed to schedule or dispatch technician team within the committed SLA window"),

    ("Installation delay",
     "Contractor dispatching / Re-assign failure",
     "Backoffice operations (Contractor)",
     "Contractor",
     "Repeated re-assignment or dispatch failure by contractor — no team was successfully dispatched"),

    ("Installation delay",
     "Delay in request registration",
     "Backoffice operations (OJO)",
     "ISP",
     "Customer request was not registered promptly in the OJO system, causing downstream delay before dispatch"),

    ("Installation delay",
     "Missed appointment",
     "SOP Non-compliance",
     "Technical Team Responsibility",
     "Field team missed the scheduled customer appointment without proactive notification or rescheduling per SOP"),

    ("Installation delay",
     "Work permits delay",
     "Backoffice operations (OJO)",
     "ISP",
     "Required municipal or building permits were not secured in time — ISP backoffice responsible"),

    ("Installation delay",
     "Pending site survey / validation",
     "Backoffice operations (OJO)",
     "ISP",
     "Site survey was not completed before job dispatch, blocking installation start"),

    ("Installation delay",
     "Material shortage",
     "Backoffice operations (OJO)",
     "ISP",
     "Required installation materials (cables, connectors, ONT) were not available due to ISP supply chain failure"),

    ("Installation delay",
     "Inventory shortage",
     "Backoffice operations (OJO)",
     "ISP",
     "Warehouse inventory depleted — not replenished in time to meet scheduled installations"),

    ("Installation delay",
     "Customer postponed appointment",
     "Customer behavior",
     "Customer",
     "Customer repeatedly postponed or cancelled the scheduled visit — installation delay attributable to customer"),

    ("Installation delay",
     "Weather conditions",
     "External / Force majeure",
     "External",
     "Extreme weather (storm, rain, heat) made outdoor or aerial installation physically impossible"),

    # ══════════════════════════════════════════════════════════════════════════
    # L1: INSTALLATION QUALITY (The Problem: Workmanship or execution defects)
    # ══════════════════════════════════════════════════════════════════════════

    ("Installation quality",
     "Bad installation",
     "Technical execution failure",
     "Technical Team Responsibility",
     "Installation was performed incorrectly and does not meet Nokia quality standards — requires rework"),

    ("Installation quality",
     "Bad splicing",
     "Technical execution failure",
     "Technical Team Responsibility",
     "Fiber splice was executed incorrectly causing high optical attenuation or signal degradation"),

    ("Installation quality",
     "Installation Method — wrong approach used",
     "Technical execution failure",
     "Technical Team Responsibility",
     "Wrong installation method applied (incorrect cable routing, wrong fixings, or improper drop cable)"),

    ("Installation quality",
     "Incomplete service delivery",
     "SOP Non-compliance",
     "Technical Team Responsibility",
     "Technician closed the work order without completing all required checklist steps and verification"),

    ("Installation quality",
     "Installation quality below standard",
     "Technical execution failure",
     "Technical Team Responsibility",
     "Overall workmanship did not meet Nokia quality benchmarks (cable routing, labeling, aesthetics)"),

    ("Installation quality",
     "Standard violation",
     "SOP Non-compliance",
     "Technical Team Responsibility",
     "Field technician violated Nokia published field work standards during installation"),

    ("Installation quality",
     "Not satisfied with installation team",
     "Technical execution failure",
     "Technical Team Responsibility",
     "Customer expressed dissatisfaction with team's workmanship, attitude, or professionalism"),

    # ══════════════════════════════════════════════════════════════════════════
    # L1: QoS (The Problem: Service quality, Wi-Fi coverage, speed, drops)
    # ══════════════════════════════════════════════════════════════════════════

    # — L2: WiFi coverage ──────────────────────────────────────────────────────
    ("QoS",
     "WiFi coverage",
     "Incorrect ONT location",
     "Technical Team Responsibility",
     "ONT device was placed in a suboptimal location (inside cabinet, dead zone, far from living areas) degrading Wi-Fi coverage"),

    ("QoS",
     "WiFi coverage",
     "Incorrect extender location",
     "Technical Team Responsibility",
     "Wi-Fi extender was placed in a suboptimal location — causing coverage dead zones"),

    ("QoS",
     "WiFi coverage",
     "Faulty extender",
     "ISP",
     "Wi-Fi extender hardware unit is defective — unit must be replaced under warranty"),

    ("QoS",
     "WiFi coverage",
     "Extender not working",
     "ISP",
     "Wi-Fi extender unit stopped functioning after installation — configuration or device fault"),

    # — L2: Service not working ────────────────────────────────────────────────
    ("QoS",
     "Service not working",
     "ONT software fault",
     "ISP",
     "ONT firmware / software malfunction causing full service outage — provisioning or software defect"),

    ("QoS",
     "Service not working",
     "PPPoE session drop",
     "ISP",
     "PPPoE authentication session dropping repeatedly due to core network or ONT configuration error"),

    ("QoS",
     "Service not working",
     "Landline deactivated",
     "ISP",
     "VoIP / landline service was inadvertently deactivated during provisioning or change order"),

    # — L2: Service interruption ───────────────────────────────────────────────
    ("QoS",
     "Service interruption",
     "Fiber cut",
     "ISP",
     "Physical fiber cable was cut (civil works, third-party damage, accident) — requires field repair"),

    ("QoS",
     "Service interruption",
     "Fault not managed",
     "ISP",
     "Active fault was not escalated or tracked properly by NOC / fault management team causing extended outage"),

    # — L2: Speed & Performance ────────────────────────────────────────────────
    ("QoS",
     "Speed issue",
     "Optical power degradation (High attenuation)",
     "Technical Team Responsibility",
     "High optical loss (dB loss) due to microbending, dirty connector, or bad splice causing packet loss"),

    ("QoS",
     "Speed issue",
     "Core / GPON network congestion",
     "ISP",
     "GPON port oversubscription or ISP core link saturation during peak hours"),

    # ══════════════════════════════════════════════════════════════════════════
    # L1: CUSTOMER ISSUE (The Problem: Out of scope, customer devices, conduct)
    # ══════════════════════════════════════════════════════════════════════════

    # — L2: Out of scope request ───────────────────────────────────────────────
    ("Customer issue",
     "Out of scope request",
     "Floor sharing",
     "Customer",
     "Customer requests Cat6 cabling across floors or installing Wi-Fi repeaters not covered by standard subscription"),

    ("Customer issue",
     "Out of scope request",
     "Cellular network",
     "Customer",
     "Customer complaint is about mobile cellular phone coverage — entirely outside FTTH broadband scope"),

    ("Customer issue",
     "Out of scope request",
     "Third-party app",
     "Customer",
     "Performance issue originates in a third-party application or server (Netflix, gaming servers, Zoom)"),

    ("Customer issue",
     "Out of scope request",
     "IPTV service",
     "Customer",
     "IPTV service issue not part of the active ISP package or unmanaged third-party stream"),

    # — L2: Customer equipment & premises ──────────────────────────────────────
    ("Customer issue",
     "Customer equipment",
     "Customer-owned device causing issue",
     "Customer",
     "Problem originates in customer-owned hardware (unmanaged switch, old 100Mbps laptop NIC, personal router)"),

    ("Customer issue",
     "Customer premises limitation",
     "Structural / Conduit blockage",
     "Customer",
     "Home internal conduits blocked, thick concrete structure, or no internal pathway for cabling"),

    # — L2: Customer conduct ───────────────────────────────────────────────────
    ("Customer issue",
     "Customer conduct",
     "Verbal abuse",
     "Customer",
     "Customer exhibited verbal abuse or physically threatening behaviour toward field team"),

    ("Customer issue",
     "Customer conduct",
     "Bad behaviour",
     "Customer",
     "Customer or household member showed hostile or uncooperative behaviour during visit"),

    ("Customer issue",
     "Customer conduct",
     "Repeated postponement",
     "Customer",
     "Customer repeatedly postponed or cancelled scheduled appointments"),

    # ══════════════════════════════════════════════════════════════════════════
    # L1: MAINTENANCE (The Problem: Post-install hardware/infrastructure repairs)
    # ══════════════════════════════════════════════════════════════════════════

    ("Maintenance",
     "Device failure",
     "Faulty ONT",
     "ISP",
     "ONT hardware unit is defective and must be replaced — Nokia warranty / RMA process applies"),

    ("Maintenance",
     "Device failure",
     "Faulty extender",
     "ISP",
     "Wi-Fi extender hardware is defective — Nokia-supplied unit requires replacement"),

    ("Maintenance",
     "Preventive maintenance missed",
     "Backoffice operations (OJO)",
     "ISP",
     "Scheduled preventive maintenance was overdue or not planned — ISP backoffice scheduling failure"),

    ("Maintenance",
     "Maintenance quality",
     "Misdiagnosis",
     "Technical Team Responsibility",
     "Field team identified the wrong root cause during maintenance, leading to unnecessary revisits"),

    ("Maintenance",
     "Maintenance quality",
     "Fault not resolved",
     "Technical Team Responsibility",
     "Maintenance visit completed but fault was not fully resolved — ticket closed prematurely"),

    # ══════════════════════════════════════════════════════════════════════════
    # L1: CUSTOMER SERVICE (The Problem: Call center, communication, CRM data)
    # ══════════════════════════════════════════════════════════════════════════

    ("Customer service",
     "Communication failure",
     "No follow-up after complaint",
     "ISP",
     "No proactive follow-up was done after initial complaint — customer left without status update"),

    ("Customer service",
     "Communication failure",
     "Information not shared with customer",
     "ISP",
     "Customer was not informed of ticket status, scheduled visit dates, or resolution steps"),

    ("Customer service",
     "Customer misinformation",
     "Customer service process failure",
     "ISP",
     "Customer was given incorrect information about service terms, delivery dates, or offer details"),

    ("Customer service",
     "CRM data quality issue",
     "Invalid / wrong contact number",
     "ISP",
     "Contact number stored in CRM is invalid or outdated — prevents dispatch coordination and callbacks"),

    ("Customer service",
     "CRM data quality issue",
     "Wrong customer information in system",
     "ISP",
     "Customer address, account, or service data in CRM is incorrect — causing job dispatch errors"),

    ("Customer service",
     "Field conduct",
     "Unprofessional conduct by technician",
     "Technical Team Responsibility",
     "Field technician displayed unprofessional behaviour violating Nokia code of conduct"),

    ("Customer service",
     "Field standards",
     "Standard violation — field team",
     "Technical Team Responsibility",
     "Technician violated Nokia published customer interaction standards"),

    # ══════════════════════════════════════════════════════════════════════════
    # L1: SALES & SERVICES (The Problem: Commercial promises, billing, contracts)
    # ══════════════════════════════════════════════════════════════════════════

    ("Sales & Services",
     "Sales miscommitment",
     "SOP Non-compliance (Sales)",
     "ISP",
     "Sales representative committed to speed, features, or dates beyond actual package offered"),

    ("Sales & Services",
     "Offer eligibility",
     "Sales / System eligibility error",
     "ISP",
     "Customer was sold a plan they do not technically or contractually qualify for"),

    ("Sales & Services",
     "Pricing discrepancy",
     "Commercial / Billing process failure",
     "ISP",
     "Customer received an incorrect or unexpected charge not matching the agreed offer"),

    ("Sales & Services",
     "Transfer fees dispute",
     "Commercial communication failure",
     "ISP",
     "Transfer/relocation fees were not clearly communicated during sales — customer dispute"),

    ("Sales & Services",
     "Billing error",
     "Commercial / Billing process failure",
     "ISP",
     "Billing error, duplicate charge, or invoice discrepancy raised by customer"),

    ("Sales & Services",
     "Delay in benefit fulfillment",
     "Backoffice operations (OJO)",
     "ISP",
     "Promised benefits (discounts, free months, devices) were not applied on time"),

    ("Sales & Services",
     "Pending sales approval",
     "Backoffice operations (OJO)",
     "ISP",
     "Sales order stuck in approval workflow — blocking activation or installation scheduling"),

    ("Sales & Services",
     "Existing subscription conflict",
     "Customer has existing subscription",
     "Customer",
     "Customer already has an active competing subscription — eligibility conflict is customer-side"),

    # ══════════════════════════════════════════════════════════════════════════
    # L1: NON-ISSUE FEEDBACK (The Problem: Unsubstantiated claims, perception)
    # ══════════════════════════════════════════════════════════════════════════

    ("Non-issue feedback",
     "Low score — No real defect",
     "Customer education gap",
     "Customer",
     "Customer gave a low NPS / satisfaction score without an actual underlying service failure"),

    ("Non-issue feedback",
     "Misunderstanding of service scope",
     "Customer education gap",
     "Customer",
     "Customer complaint stems from a misunderstanding of what the subscription includes"),

    ("Non-issue feedback",
     "Customer confirmed no issue on follow-up",
     "Customer education gap",
     "Customer",
     "Customer confirmed the issue was resolved or did not exist when contacted for follow-up"),

    # ══════════════════════════════════════════════════════════════════════════
    # L1: OJO/FTTH NOT SERVICEABLE (The Problem: Physical infrastructure absence)
    # ══════════════════════════════════════════════════════════════════════════

    ("OJO/FTTH not serviceable",
     "Coverage area — Location not in network",
     "Network infrastructure gap",
     "ISP",
     "Customer address is outside FTTH rollout coverage zone — no infrastructure available"),

    ("OJO/FTTH not serviceable",
     "Full distribution box — No port available",
     "Network infrastructure gap",
     "ISP",
     "Optical Distribution Box at customer area is at full capacity — no free ports"),

    # ══════════════════════════════════════════════════════════════════════════
    # L1: NOT SPECIFIED (Missing or unrecorded data)
    # ══════════════════════════════════════════════════════════════════════════

    ("Not specified",
     "Root cause undetermined",
     "Missing investigation data",
     "N/A",
     "Investigation could not determine root cause — data was insufficient"),

    ("Not specified",
     "Root cause not recorded",
     "Missing investigation data",
     "N/A",
     "Root cause field was left blank in the system — data entry non-compliance"),
]


# ==============================================================================
# COLOUR PALETTE
# ==============================================================================
NOKIA_NAVY   = "001133"
NOKIA_BLUE   = "0057D9"
WHITE        = "FFFFFF"
LIGHT_GREY   = "F4F6F9"
MID_GREY     = "E1E6EF"

LEVEL_COLORS = {
    "L1": {
        "Installation delay":        ("1B5E20", "E8F5E9"),
        "Installation quality":      ("2E7D32", "E8F5E9"),
        "QoS":                       ("0D47A1", "E3F2FD"),
        "Maintenance":               ("4A148C", "F3E5F5"),
        "Customer service":          ("006064", "E0F7FA"),
        "Sales & Services":          ("B71C1C", "FFEBEE"),
        "Customer issue":            ("E65100", "FFF3E0"),
        "Non-issue feedback":        ("33691E", "F1F8E9"),
        "OJO/FTTH not serviceable":  ("4E342E", "EFEBE9"),
        "Not specified":             ("616161", "F5F5F5"),
    }
}
DEFAULT_L1 = ("455A64", "ECEFF1")

OWNERSHIP_STYLES = {
    "ISP":                        ("0057D9", "E3F2FD", "Nokia / ISP"),
    "Contractor":                 ("2E7D32", "E8F5E9", "Contractor"),
    "Technical Team Responsibility": ("E65100", "FFF3E0", "Technical Team"),
    "Customer":                   ("6A1B9A", "F3E5F5", "Customer"),
    "External":                   ("795548", "EFEBE9", "External"),
    "N/A":                        ("757575", "F5F5F5", "N/A"),
}

def get_l1_colors(reason):
    return LEVEL_COLORS["L1"].get(reason, DEFAULT_L1)

def fill(hex_c):
    return PatternFill("solid", fgColor=hex_c)

def thin_b():
    s = Side(style="thin", color="CFD8DC")
    return Border(left=s, right=s, top=s, bottom=s)

def med_b():
    s = Side(style="medium", color="90A4AE")
    return Border(left=s, right=s, top=s, bottom=s)

def thick_b():
    s = Side(style="medium", color="37474F")
    return Border(left=s, right=s, top=s, bottom=s)

def hdr(cell, bg=NOKIA_NAVY, fg=WHITE, sz=11, bold=True, center=True):
    cell.fill = fill(bg)
    cell.font = Font(name="Calibri", color=fg, size=sz, bold=bold)
    cell.alignment = Alignment(horizontal="center" if center else "left",
                               vertical="center", wrap_text=True)
    cell.border = thick_b()

def body(cell, bg=WHITE, fg="212121", sz=10, bold=False, center=False, wrap=True):
    cell.fill = fill(bg)
    cell.font = Font(name="Calibri", color=fg, size=sz, bold=bold)
    cell.alignment = Alignment(horizontal="center" if center else "left",
                               vertical="center", wrap_text=wrap)
    cell.border = thin_b()


# ==============================================================================
# SHEET 1 — RCA 4-Level Cascade (Main Sheet, merged-cell hierarchy)
# ==============================================================================
def sheet_cascade(wb):
    ws = wb.create_sheet("RCA 4-Level Cascade", 0)
    ws.freeze_panes = "A3"
    ws.sheet_view.showGridLines = False

    # ── Title banner ──────────────────────────────────────────────────────────
    ws.merge_cells("A1:F1")
    t = ws.cell(row=1, column=1,
                value="Nokia Quality Tracker — RCA 4-Level Cascade Template")
    t.fill = fill(NOKIA_NAVY)
    t.font = Font(name="Calibri", color=WHITE, size=15, bold=True)
    t.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 38

    # ── Level label row ───────────────────────────────────────────────────────
    LEVEL_HDR = [
        ("LEVEL 1\nREASON\n(The Problem)",            "0D47A1"),
        ("LEVEL 2\nSUB-REASON\n(Process Failure)",    "1B5E20"),
        ("LEVEL 3\nROOT CAUSE\n(Operational Defect)", "B71C1C"),
        ("LEVEL 4\nOWNERSHIP\n(Accountable Party)",   "4A148C"),
        ("NOTES / RATIONALE",                          "37474F"),
    ]
    col_widths = [28, 40, 38, 24, 60]

    for c, ((title, bg), w) in enumerate(zip(LEVEL_HDR, col_widths), 1):
        cell = ws.cell(row=2, column=c, value=title)
        hdr(cell, bg=bg, sz=10)
        ws.column_dimensions[get_column_letter(c)].width = w
    ws.row_dimensions[2].height = 48

    # ── Data rows (merged L1 and L2 spans) ────────────────────────────────────
    from itertools import groupby

    sorted_data = sorted(RCA_DATA, key=lambda x: (x[0], x[1], x[2]))
    row = 3

    for l1, l1_group in groupby(sorted_data, key=lambda x: x[0]):
        dark_c, light_c = get_l1_colors(l1)
        l1_start = row
        l1_items = list(l1_group)

        for l2, l2_group in groupby(l1_items, key=lambda x: x[1]):
            l2_start = row
            l2_items = list(l2_group)

            for l1_, l2_, l3, l4, notes in l2_items:
                # Ownership styling
                own_key = l4.strip()
                own_fg, own_bg, own_label = OWNERSHIP_STYLES.get(
                    own_key, ("455A64", "F5F5F5", own_key))

                row_bg = light_c if row % 2 == 0 else WHITE

                # L1 placeholder (will be merged + styled after)
                c1 = ws.cell(row=row, column=1, value=l1)
                body(c1, bg=row_bg)

                # L2 placeholder (will be merged + styled after)
                c2 = ws.cell(row=row, column=2, value=l2)
                body(c2, bg=row_bg)

                # L3 — Root Cause
                c3 = ws.cell(row=row, column=3, value=l3)
                body(c3, bg=row_bg, fg="8B0000", bold=False)

                # L4 — Ownership badge
                c4 = ws.cell(row=row, column=4, value=own_label)
                c4.fill = fill(own_bg)
                c4.font = Font(name="Calibri", color=own_fg,
                               size=10, bold=True)
                c4.alignment = Alignment(horizontal="center",
                                         vertical="center", wrap_text=True)
                c4.border = thin_b()

                # Notes
                c5 = ws.cell(row=row, column=5, value=notes)
                body(c5, bg=row_bg, fg="546E7A", sz=9)

                ws.row_dimensions[row].height = 22
                row += 1

            # Merge L2 column for this sub-group
            if row - l2_start > 1:
                ws.merge_cells(start_row=l2_start, start_column=2,
                               end_row=row-1, end_column=2)
            m2 = ws.cell(row=l2_start, column=2, value=l2)
            m2.fill = fill(light_c)
            m2.font = Font(name="Calibri", color=dark_c, size=10, bold=False)
            m2.alignment = Alignment(horizontal="left", vertical="center",
                                     wrap_text=True)
            m2.border = thin_b()

        # Merge L1 column for this reason group
        if row - l1_start > 1:
            ws.merge_cells(start_row=l1_start, start_column=1,
                           end_row=row-1, end_column=1)
        m1 = ws.cell(row=l1_start, column=1, value=l1)
        m1.fill = fill(dark_c)
        m1.font = Font(name="Calibri", color=WHITE, size=11, bold=True)
        m1.alignment = Alignment(horizontal="center", vertical="center",
                                 wrap_text=True)
        m1.border = thick_b()

    ws.auto_filter.ref = f"A2:E{row-1}"
    return ws


# ==============================================================================
# SHEET 2 — Flat Filterable Table (no merges)
# ==============================================================================
def sheet_flat(wb):
    ws = wb.create_sheet("Flat Filterable View")
    ws.freeze_panes = "A2"
    ws.sheet_view.showGridLines = False

    cols = ["#",
            "L1 — REASON (Problem)",
            "L2 — SUB-REASON (Process Failure)",
            "L3 — ROOT CAUSE (Operational Defect)",
            "L4 — OWNERSHIP",
            "NOTES"]
    widths = [5, 28, 40, 38, 22, 60]

    for c, (h, w) in enumerate(zip(cols, widths), 1):
        cell = ws.cell(row=1, column=c, value=h)
        hdr(cell, bg=NOKIA_NAVY, sz=10)
        ws.column_dimensions[get_column_letter(c)].width = w
    ws.row_dimensions[1].height = 30

    for i, (l1, l2, l3, l4, notes) in enumerate(RCA_DATA, 1):
        dark_c, light_c = get_l1_colors(l1)
        own_key = l4.strip()
        own_fg, own_bg, own_label = OWNERSHIP_STYLES.get(
            own_key, ("455A64", "F5F5F5", own_key))
        bg = LIGHT_GREY if i % 2 == 0 else WHITE
        r = i + 1

        n_cell = ws.cell(row=r, column=1, value=i)
        body(n_cell, bg=bg, fg="9E9E9E", center=True)

        l1_cell = ws.cell(row=r, column=2, value=l1)
        l1_cell.fill = fill(dark_c)
        l1_cell.font = Font(name="Calibri", color=WHITE, size=10, bold=True)
        l1_cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
        l1_cell.border = thin_b()

        c2 = ws.cell(row=r, column=3, value=l2)
        body(c2, bg=bg, fg=dark_c, bold=False)

        c3 = ws.cell(row=r, column=4, value=l3)
        body(c3, bg=bg, fg="8B0000")

        c4 = ws.cell(row=r, column=5, value=own_label)
        c4.fill = fill(own_bg)
        c4.font = Font(name="Calibri", color=own_fg, size=10, bold=True)
        c4.alignment = Alignment(horizontal="center", vertical="center")
        c4.border = thin_b()

        c5 = ws.cell(row=r, column=6, value=notes)
        body(c5, bg=bg, fg="607D8B", sz=9)

        ws.row_dimensions[r].height = 18

    ws.auto_filter.ref = f"A1:F{len(RCA_DATA)+1}"
    return ws


# ==============================================================================
# SHEET 3 — Ownership Distribution Matrix
# ==============================================================================
def sheet_matrix(wb):
    ws = wb.create_sheet("Ownership Matrix")
    ws.sheet_view.showGridLines = False

    ws.merge_cells("A1:F1")
    t = ws.cell(row=1, column=1,
                value="Ownership Distribution — Cases per Accountable Party per Reason")
    t.fill = fill(NOKIA_NAVY)
    t.font = Font(name="Calibri", color=WHITE, size=13, bold=True)
    t.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 32

    from collections import defaultdict
    counts = defaultdict(lambda: defaultdict(int))
    for l1, l2, l3, l4, _ in RCA_DATA:
        own_key = l4.strip()
        _, _, label = OWNERSHIP_STYLES.get(own_key, ("", "", own_key))
        counts[l1][label] += 1

    owners = ["Nokia / ISP", "Contractor", "Technical Team", "Customer", "External", "N/A"]
    headers = ["REASON (L1)", "TOTAL"] + owners

    col_widths = [30, 9] + [18]*len(owners)
    for c, (h, w) in enumerate(zip(headers, col_widths), 1):
        cell = ws.cell(row=2, column=c, value=h)
        hdr(cell, bg=NOKIA_BLUE, sz=10)
        ws.column_dimensions[get_column_letter(c)].width = w
    ws.row_dimensions[2].height = 30

    reasons_order = [
        "Installation", "QoS", "Maintinance", "Customer service",
        "Sales & Services", "Customer issue", "Non-issue feedback",
        "Backoffice operations", "OJO/FTTH not serviceable", "Not specified"
    ]
    grand = defaultdict(int)
    grand_total = 0
    row = 3
    for reason in reasons_order:
        if reason not in counts and not any(r[0] == reason for r in RCA_DATA):
            continue
        dark_c, light_c = get_l1_colors(reason)
        total = sum(counts[reason].values())
        grand_total += total

        c1 = ws.cell(row=row, column=1, value=reason)
        c1.fill = fill(dark_c); c1.font = Font(name="Calibri", color=WHITE, size=10, bold=True)
        c1.alignment = Alignment(horizontal="left", vertical="center"); c1.border = thick_b()

        c2 = ws.cell(row=row, column=2, value=total)
        body(c2, bg=light_c, fg="212121", bold=True, center=True)

        for c_off, own in enumerate(owners, 3):
            cnt = counts[reason].get(own, 0)
            grand[own] += cnt
            if cnt:
                own_key_rev = {v[2]: k for k, v in OWNERSHIP_STYLES.items()}.get(own, own)
                own_fg, own_bg, _ = OWNERSHIP_STYLES.get(own_key_rev, ("455A64", "F5F5F5", own))
                cell = ws.cell(row=row, column=c_off, value=cnt)
                cell.fill = fill(own_bg)
                cell.font = Font(name="Calibri", color=own_fg, size=10, bold=True)
                cell.alignment = Alignment(horizontal="center", vertical="center")
                cell.border = thin_b()
            else:
                cell = ws.cell(row=row, column=c_off, value="—")
                body(cell, bg=light_c, fg="BDBDBD", center=True)

        ws.row_dimensions[row].height = 20
        row += 1

    # Grand total row
    c1 = ws.cell(row=row, column=1, value="GRAND TOTAL")
    c1.fill = fill(NOKIA_NAVY); c1.font = Font(name="Calibri", color=WHITE, size=11, bold=True)
    c1.alignment = Alignment(horizontal="center", vertical="center"); c1.border = thick_b()
    c2 = ws.cell(row=row, column=2, value=grand_total)
    c2.fill = fill(NOKIA_NAVY); c2.font = Font(name="Calibri", color=WHITE, size=11, bold=True)
    c2.alignment = Alignment(horizontal="center", vertical="center"); c2.border = thick_b()
    for c_off, own in enumerate(owners, 3):
        cell = ws.cell(row=row, column=c_off, value=grand.get(own, 0))
        cell.fill = fill(NOKIA_NAVY)
        cell.font = Font(name="Calibri", color=WHITE, size=10, bold=True)
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thick_b()
    ws.row_dimensions[row].height = 24
    return ws


# ==============================================================================
# SHEET 4 — Data Entry Form (dropdowns driven by hidden _Lookups sheet)
# ==============================================================================
def sheet_entry(wb):
    ws = wb.create_sheet("Data Entry Form")
    ws.freeze_panes = "A3"
    ws.sheet_view.showGridLines = False

    ws.merge_cells("A1:H1")
    t = ws.cell(row=1, column=1,
                value="Nokia Quality Tracker — RCA Data Entry Form  [Use dropdowns in columns D, E, F, G]")
    t.fill = fill(NOKIA_NAVY)
    t.font = Font(name="Calibri", color=WHITE, size=12, bold=True)
    t.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 34

    COLS = [
        ("#",            5,  "9E9E9E"),
        ("Ticket ID",   18,  NOKIA_NAVY),
        ("Customer",    22,  NOKIA_NAVY),
        ("L1 — REASON\n(The Problem)",           28, "0D47A1"),
        ("L2 — SUB-REASON\n(Process Failure)",   38, "1B5E20"),
        ("L3 — ROOT CAUSE\n(Operational Defect)",36, "B71C1C"),
        ("L4 — OWNERSHIP\n(Accountable Party)",  20, "4A148C"),
        ("Notes",       40,  "37474F"),
    ]
    for c, (h, w, bg) in enumerate(COLS, 1):
        cell = ws.cell(row=2, column=c, value=h)
        hdr(cell, bg=bg, sz=10)
        ws.column_dimensions[get_column_letter(c)].width = w
    ws.row_dimensions[2].height = 44

    # Build lookup lists
    reasons = sorted(set(r[0] for r in RCA_DATA))
    sub_rsns = sorted(set(r[1] for r in RCA_DATA))
    root_causes = sorted(set(r[2] for r in RCA_DATA))
    ownerships = ["ISP", "Contractor", "Technical Team Responsibility",
                  "Customer", "External", "N/A"]

    lws = wb.create_sheet("_Lookups")
    lws.sheet_state = "hidden"
    for i, v in enumerate(reasons, 1):     lws.cell(row=i, column=1, value=v)
    for i, v in enumerate(sub_rsns, 1):    lws.cell(row=i, column=2, value=v)
    for i, v in enumerate(root_causes, 1): lws.cell(row=i, column=3, value=v)
    for i, v in enumerate(ownerships, 1):  lws.cell(row=i, column=4, value=v)

    dv_r  = DataValidation(type="list", formula1=f"_Lookups!$A$1:$A${len(reasons)}",     showDropDown=False)
    dv_sr = DataValidation(type="list", formula1=f"_Lookups!$B$1:$B${len(sub_rsns)}",    showDropDown=False)
    dv_rc = DataValidation(type="list", formula1=f"_Lookups!$C$1:$C${len(root_causes)}", showDropDown=False)
    dv_ow = DataValidation(type="list", formula1=f"_Lookups!$D$1:$D${len(ownerships)}",  showDropDown=False)
    for dv in [dv_r, dv_sr, dv_rc, dv_ow]: ws.add_data_validation(dv)

    for i in range(3, 203):
        bg = WHITE if i % 2 == 0 else LIGHT_GREY
        n = ws.cell(row=i, column=1, value=i-2)
        body(n, bg=bg, fg="BDBDBD", center=True)
        for c in range(2, 9):
            body(ws.cell(row=i, column=c), bg=bg)
        dv_r .add(ws.cell(row=i, column=4))
        dv_sr.add(ws.cell(row=i, column=5))
        dv_rc.add(ws.cell(row=i, column=6))
        dv_ow.add(ws.cell(row=i, column=7))
        ws.row_dimensions[i].height = 18
    return ws


# ==============================================================================
# SHEET 5 — Quick Reference Legend
# ==============================================================================
def sheet_legend(wb):
    ws = wb.create_sheet("Quick Reference")
    ws.sheet_view.showGridLines = False

    # Title
    ws.merge_cells("A1:C1")
    t = ws.cell(row=1, column=1, value="RCA 4-Level Framework — Quick Reference")
    t.fill = fill(NOKIA_NAVY); t.font = Font(name="Calibri", color=WHITE, size=13, bold=True)
    t.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30

    levels = [
        ("LEVEL 1 — REASON", "The Problem",          "0D47A1",
         ["Installation delay", "Installation quality", "QoS", "Maintenance",
          "Customer service", "Sales & Services", "Customer issue",
          "Non-issue feedback", "OJO/FTTH not serviceable", "Not specified"]),
        ("LEVEL 2 — SUB-REASON", "Process Failure",  "1B5E20",
         sorted(set(r[1] for r in RCA_DATA))),
        ("LEVEL 3 — ROOT CAUSE", "Operational Defect", "B71C1C",
         sorted(set(r[2] for r in RCA_DATA))),
        ("LEVEL 4 — OWNERSHIP", "Accountable Party",  "4A148C",
         ["ISP", "Contractor", "Technical Team Responsibility",
          "Customer", "External", "N/A"]),
    ]

    col = 1
    for lbl, desc, bg, vals in levels:
        ws.column_dimensions[get_column_letter(col)].width = 42
        hdr_cell = ws.cell(row=2, column=col, value=f"{lbl}\n({desc})")
        hdr(hdr_cell, bg=bg, sz=11)
        ws.row_dimensions[2].height = 36
        for i, v in enumerate(vals, 3):
            c = ws.cell(row=i, column=col, value=v)
            c.fill = fill(LIGHT_GREY if i % 2 == 0 else WHITE)
            c.font = Font(name="Calibri", color="212121", size=10)
            c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            c.border = thin_b()
            ws.row_dimensions[i].height = 16
        col += 1
    return ws


# ==============================================================================
# MAIN
# ==============================================================================
def main():
    wb = Workbook()
    wb.remove(wb.active)

    sheet_cascade(wb)
    sheet_flat(wb)
    sheet_matrix(wb)
    sheet_entry(wb)
    sheet_legend(wb)

    out_paths = [
        r"C:\Users\LENOVO\Desktop\Nokia_RCA_Template.xlsx",
        "Nokia_RCA_Template.xlsx"
    ]
    for out in out_paths:
        try:
            wb.save(out)
            print(f"[OK] Saved: {out}")
        except Exception as e:
            print(f"[WARN] Could not save to {out}: {e}")
    print(f"     Total records: {len(RCA_DATA)}")
    for s in wb.sheetnames:
        print(f"     - {s}")

if __name__ == "__main__":
    main()
