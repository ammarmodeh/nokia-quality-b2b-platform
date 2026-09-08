"""
Nokia Quality Task Tracker
RCA 4-Level Cascade Framework Document Generator (.docx)
Level 1: Reason (The Problem)
Level 2: Sub-Reason (Process Failure)
Level 3: Root Cause (Operational Defect)
Level 4: Ownership (Accountable Party)
"""
import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="D3D3D3"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="{color}"/>
            <w:left w:val="none"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="{color}"/>
            <w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)

def build_rca_document():
    doc = Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Color Palette
    PRIMARY = RGBColor(18, 65, 145)     # Nokia Navy (#124191)
    SECONDARY = RGBColor(0, 90, 255)    # Nokia Blue (#005AFF)
    DARK_TEXT = RGBColor(33, 37, 41)    # Charcoal
    MUTED_TEXT = RGBColor(108, 117, 125)# Slate
    WHITE = RGBColor(255, 255, 255)

    # Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10)
    normal_style.font.color.rgb = DARK_TEXT

    # -------------------------------------------------------------
    # HEADER / TITLE BLOCK
    # -------------------------------------------------------------
    header_p = doc.add_paragraph()
    header_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run_tag = header_p.add_run("NOKIA QUALITY TASK TRACKER | OPERATIONAL STANDARDS")
    run_tag.font.size = Pt(8.5)
    run_tag.font.bold = True
    run_tag.font.color.rgb = MUTED_TEXT

    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(12)
    title_p.paragraph_format.space_after = Pt(4)
    run_title = title_p.add_run("Root Cause Analysis (RCA) 4-Level Framework")
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = PRIMARY

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(18)
    run_sub = sub_p.add_run("Standardized Incident Classification & Ownership Mapping Architecture")
    run_sub.font.size = Pt(13)
    run_sub.font.italic = True
    run_sub.font.color.rgb = SECONDARY

    # Meta box table
    meta_tbl = doc.add_table(rows=2, cols=4)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_tbl.autofit = False
    set_table_borders(meta_tbl, "CCCCCC")

    headers = ["Document Version", "Framework Model", "Accountability Parties", "Last Updated"]
    values = ["v3.0.0 (Enterprise)", "4-Level Hierarchical Cascade", "ISP | Contractor | Field | Customer", "September 2026"]

    for i in range(4):
        c_hdr = meta_tbl.cell(0, i)
        set_cell_background(c_hdr, "F0F4F8")
        set_cell_margins(c_hdr, top=80, bottom=80, left=100, right=100)
        p = c_hdr.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(headers[i])
        r.font.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = PRIMARY

        c_val = meta_tbl.cell(1, i)
        set_cell_margins(c_val, top=80, bottom=80, left=100, right=100)
        p2 = c_val.paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r2 = p2.add_run(values[i])
        r2.font.size = Pt(9)
        r2.font.color.rgb = DARK_TEXT

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------
    # SECTION 1: ARCHITECTURE OVERVIEW
    # -------------------------------------------------------------
    s1_p = doc.add_paragraph()
    s1_p.paragraph_format.space_before = Pt(16)
    s1_p.paragraph_format.space_after = Pt(6)
    r_s1 = s1_p.add_run("1. The 4-Level RCA Hierarchy Architecture")
    r_s1.font.size = Pt(14)
    r_s1.font.bold = True
    r_s1.font.color.rgb = PRIMARY

    desc_p = doc.add_paragraph()
    desc_p.paragraph_format.space_after = Pt(10)
    desc_p.add_run(
        "To achieve complete operational consistency and eliminate ambiguity across quality audits, field operations, and customer experience tracking, "
        "the Nokia RCA Framework enforces a strict 4-level deterministic cascade. Every issue reported from the field or backoffice maps directly through this taxonomy:"
    )

    # Framework levels table
    levels_tbl = doc.add_table(rows=5, cols=3)
    levels_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(levels_tbl, "B0BEC5")

    lvl_defs = [
        ("Level 1", "Reason (The Problem)", "High-level macro domain where the failure manifested (e.g., Installation Delay, QoS, Maintenance, Customer Issue, Sales & Services)."),
        ("Level 2", "Sub-Reason (Process Failure)", "The specific operational or procedural breakdown that took place (e.g., Delay in request registration, Missed appointment, Out of scope request)."),
        ("Level 3", "Root Cause (Operational Defect)", "The exact root-level failure mechanism, device defect, or external boundary (e.g., Backoffice operations OJO, SOP Non-compliance, Floor sharing, Cellular network)."),
        ("Level 4", "Ownership (Accountable Party)", "The strictly defined contractual or operational entity responsible for resolution and prevention (ISP, Contractor, Technical Team Responsibility, Customer, External).")
    ]

    # Header row
    hdr_row = levels_tbl.rows[0]
    col_names = ["Hierarchy Level", "Designation", "Operational Definition & Scope"]
    for j, name in enumerate(col_names):
        cell = hdr_row.cells[j]
        set_cell_background(cell, "124191")
        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        p = cell.paragraphs[0]
        r = p.add_run(name)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = WHITE

    for idx, (l_code, l_name, l_desc) in enumerate(lvl_defs, 1):
        row = levels_tbl.rows[idx]
        bg = "FFFFFF" if idx % 2 != 0 else "F8F9FA"
        
        c0 = row.cells[0]
        set_cell_background(c0, bg)
        set_cell_margins(c0, top=90, bottom=90, left=100, right=100)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(l_code)
        r0.font.bold = True
        r0.font.size = Pt(9)
        r0.font.color.rgb = SECONDARY

        c1 = row.cells[1]
        set_cell_background(c1, bg)
        set_cell_margins(c1, top=90, bottom=90, left=100, right=100)
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(l_name)
        r1.font.bold = True
        r1.font.size = Pt(9)

        c2 = row.cells[2]
        set_cell_background(c2, bg)
        set_cell_margins(c2, top=90, bottom=90, left=100, right=100)
        p2 = c2.paragraphs[0]
        r2 = p2.add_run(l_desc)
        r2.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------
    # SECTION 2: SPECIALIZED OUT-OF-SCOPE & BOUNDARY RULES
    # -------------------------------------------------------------
    s2_p = doc.add_paragraph()
    s2_p.paragraph_format.space_before = Pt(14)
    s2_p.paragraph_format.space_after = Pt(6)
    r_s2 = s2_p.add_run("2. Out-of-Scope Requests & Boundary Rules")
    r_s2.font.size = Pt(14)
    r_s2.font.bold = True
    r_s2.font.color.rgb = PRIMARY

    rule_p1 = doc.add_paragraph()
    rule_p1.paragraph_format.space_after = Pt(6)
    r_bold1 = rule_p1.add_run("• Floor Sharing / Multi-Floor Cat6 Requests: ")
    r_bold1.font.bold = True
    r_bold1.font.color.rgb = PRIMARY
    rule_p1.add_run(
        "Classified strictly under Reason: Customer Issue → Sub-Reason: Out of scope request → Root Cause: Floor sharing → Ownership: Customer. "
        "Installing Cat6 across floors or setting up unauthorized Wi-Fi repeaters outside the contractual subscription package is outside standard FTTH installation SLA."
    )

    rule_p2 = doc.add_paragraph()
    rule_p2.paragraph_format.space_after = Pt(6)
    r_bold2 = rule_p2.add_run("• Cellular / Mobile Network Complaints: ")
    r_bold2.font.bold = True
    r_bold2.font.color.rgb = PRIMARY
    rule_p2.add_run(
        "Classified strictly under Reason: Customer Issue → Sub-Reason: Out of scope request → Root Cause: Cellular network → Ownership: Customer. "
        "Mobile cellular signal degradation is external to FTTH broadband delivery."
    )

    rule_p3 = doc.add_paragraph()
    rule_p3.paragraph_format.space_after = Pt(12)
    r_bold3 = rule_p3.add_run("• Customer Equipment & Premise Constraints: ")
    r_bold3.font.bold = True
    r_bold3.font.color.rgb = PRIMARY
    rule_p3.add_run(
        "Third-party apps (e.g., Netflix, gaming servers), customer-owned unmanaged routers, and structural premise limitations fall under Customer Ownership."
    )

    # -------------------------------------------------------------
    # SECTION 3: MASTER CLASSIFICATION MATRIX TABLE
    # -------------------------------------------------------------
    s3_p = doc.add_paragraph()
    s3_p.paragraph_format.space_before = Pt(16)
    s3_p.paragraph_format.space_after = Pt(6)
    r_s3 = s3_p.add_run("3. Complete Master RCA Classification Matrix")
    r_s3.font.size = Pt(14)
    r_s3.font.bold = True
    r_s3.font.color.rgb = PRIMARY

    # Master Data Rows
    matrix_data = [
        # Installation Delay
        ("Installation delay", "Delay in dispatching (Contractor / Field)", "Backoffice operations (Contractor)", "Contractor", "Contractor backoffice failed to schedule or dispatch technician team within SLA."),
        ("Installation delay", "Contractor dispatching / Re-assign failure", "Backoffice operations (Contractor)", "Contractor", "Repeated re-assignment or dispatch failure by contractor — no team dispatched."),
        ("Installation delay", "Delay in request registration", "Backoffice operations (OJO)", "ISP", "Request not registered promptly in OJO system, causing downstream delay before dispatch."),
        ("Installation delay", "Missed appointment", "SOP Non-compliance", "Technical Team Responsibility", "Field team missed scheduled customer appointment without prior notification."),
        ("Installation delay", "Work permits delay", "Backoffice operations (OJO)", "ISP", "Municipal or building permits delayed due to backoffice processing."),
        ("Installation delay", "Material shortage", "Backoffice operations (OJO)", "ISP", "ONT, fiber cable, or drop accessories out of stock from central warehouse."),
        ("Installation delay", "Customer postponed appointment", "Customer behavior", "Customer", "Customer requested rescheduling or was unavailable at site."),
        ("Installation delay", "Weather conditions", "External / Force majeure", "External", "Severe weather preventing safe aerial/outdoor fiber deployment."),

        # Installation Quality
        ("Installation quality", "Bad installation", "Technical execution failure", "Technical Team Responsibility", "Workmanship does not meet Nokia quality standards; requires rework."),
        ("Installation quality", "Bad splicing", "Technical execution failure", "Technical Team Responsibility", "Improper fusion/mechanical splice resulting in high optical attenuation (dB loss)."),
        ("Installation quality", "Installation Method — wrong approach used", "Technical execution failure", "Technical Team Responsibility", "Incorrect cable routing, wrong fixings, or improper drop cable deployed."),
        ("Installation quality", "Incomplete service delivery", "SOP Non-compliance", "Technical Team Responsibility", "Work order closed without completing full verification checklist."),
        ("Installation quality", "Standard violation", "SOP Non-compliance", "Technical Team Responsibility", "Field technician violated Nokia published field work standards."),

        # QoS
        ("QoS", "WiFi coverage", "Incorrect ONT location", "Technical Team Responsibility", "ONT installed in suboptimal spot (closet, basement, dead zone) degrading living area Wi-Fi."),
        ("QoS", "WiFi coverage", "Incorrect extender location", "Technical Team Responsibility", "Wi-Fi extender positioned in a Wi-Fi deadzone or without line of sight."),
        ("QoS", "WiFi coverage", "Faulty extender", "ISP", "Hardware failure in Nokia-supplied Wi-Fi beacon or mesh unit."),
        ("QoS", "WiFi coverage", "Extender not working", "ISP", "Wi-Fi extender unit stopped functioning after installation."),
        ("QoS", "Service not working", "ONT software fault", "ISP", "ONT firmware crash, PPPoE auth stall, or provisioning synchronization error."),
        ("QoS", "Service not working", "PPPoE session drop", "ISP", "PPPoE authentication session dropping repeatedly due to core network or ONT config."),
        ("QoS", "Service interruption", "Fiber cut", "ISP", "Civil works or third-party fiber cut along feeder or distribution cables."),
        ("QoS", "Service interruption", "Fault not managed", "ISP", "Outage ticket stuck in NOC queue without proactive customer escalation."),
        ("QoS", "Speed issue", "Optical power degradation (High attenuation)", "Technical Team Responsibility", "High dB loss on fiber line due to microbending or bad splice causing packet loss."),
        ("QoS", "Speed issue", "Core / GPON network congestion", "ISP", "GPON port oversubscription or ISP core link saturation during peak hours."),

        # Customer Issue
        ("Customer issue", "Out of scope request", "Floor sharing", "Customer", "Customer requesting Cat6 cabling across multiple floors or uncontracted repeaters."),
        ("Customer issue", "Out of scope request", "Cellular network", "Customer", "Customer complaining about mobile phone SIM reception rather than FTTH Wi-Fi."),
        ("Customer issue", "Out of scope request", "Third-party app", "Customer", "Application-specific slowdown (e.g. game server ping, streaming provider)."),
        ("Customer issue", "Customer equipment", "Customer-owned device causing issue", "Customer", "Old PC network card (100Mbps NIC) or third-party switch bottlenecking speed."),
        ("Customer issue", "Customer premises limitation", "Structural / Conduit blockage", "Customer", "Internal conduit blocked or thick reinforced concrete blocking signal."),
        ("Customer issue", "Customer conduct", "Repeated postponement", "Customer", "Customer cancelled or rescheduled technician arrival multiple times."),

        # Maintenance
        ("Maintenance", "Device failure", "Faulty ONT", "ISP", "Internal power or optical receiver defect in ONT requiring RMA replacement."),
        ("Maintenance", "Device failure", "Faulty extender", "ISP", "Wi-Fi extender hardware defect requiring equipment replacement."),
        ("Maintenance", "Preventive maintenance missed", "Backoffice operations (OJO)", "ISP", "Scheduled routine inspection or line cleanup not scheduled by ISP."),
        ("Maintenance", "Maintenance quality", "Misdiagnosis", "Technical Team Responsibility", "Technician misidentified root cause, causing repeated maintenance tickets."),
        ("Maintenance", "Maintenance quality", "Fault not resolved", "Technical Team Responsibility", "Field technician left premise before fully testing throughput and latency."),

        # Customer Service
        ("Customer service", "Communication failure", "No follow-up after complaint", "ISP", "Customer service desk failed to provide SLA update or callback."),
        ("Customer service", "Customer misinformation", "Customer service process failure", "ISP", "Call center representative provided inaccurate plan specifications or ETA."),
        ("Customer service", "CRM data quality issue", "Invalid / wrong contact number", "ISP", "Outdated or wrong phone number in CRM preventing dispatch callback."),
        ("Customer service", "CRM data quality issue", "Wrong customer information in system", "ISP", "Customer address or account data in CRM is incorrect."),
        ("Customer service", "Field conduct", "Unprofessional conduct by technician", "Technical Team Responsibility", "Field technician exhibited rude or non-compliant customer interaction."),

        # Sales & Services
        ("Sales & Services", "Sales miscommitment", "SOP Non-compliance (Sales)", "ISP", "Sales representative committed to unfeasible delivery date or throughput."),
        ("Sales & Services", "Pricing discrepancy", "Commercial / Billing process failure", "ISP", "Invoice did not reflect agreed promotional discounts or upfront terms."),
        ("Sales & Services", "Pending sales approval", "Backoffice operations (OJO)", "ISP", "Commercial order trapped in backoffice sales approval queue."),
        ("Sales & Services", "Existing subscription conflict", "Customer has existing subscription", "Customer", "Customer has active contract with competing provider."),

        # Non-Issue & Environmental
        ("Non-Issue Feedback", "Low score — No real defect", "Customer education gap", "Customer", "Customer submitted low score without measurable service impairment."),
        ("OJO / Not Serviceable", "Coverage area — Location not in network", "Network infrastructure gap", "ISP", "Building not in network rollout coverage area.")
    ]

    tbl_matrix = doc.add_table(rows=len(matrix_data)+1, cols=5)
    tbl_matrix.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_matrix, "CCCCCC")

    # Header
    m_headers = ["L1: Reason\n(The Problem)", "L2: Sub-Reason\n(Process Failure)", "L3: Root Cause\n(Operational Defect)", "L4: Ownership\n(Accountable)", "Operational Notes & Description"]
    hdr_cells = tbl_matrix.rows[0].cells
    for c_idx, title in enumerate(m_headers):
        set_cell_background(hdr_cells[c_idx], "124191")
        set_cell_margins(hdr_cells[c_idx], top=100, bottom=100, left=100, right=100)
        p = hdr_cells[c_idx].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(title)
        r.font.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = WHITE

    # Ownership colors
    def get_owner_badge_color(owner):
        if owner == "ISP": return "0D47A1"
        if owner == "Contractor": return "E65100"
        if owner == "Technical Team Responsibility": return "B71C1C"
        if owner == "Customer": return "2E7D32"
        if owner == "External": return "4A148C"
        return "616161"

    for r_idx, row_data in enumerate(matrix_data, 1):
        row = tbl_matrix.rows[r_idx]
        bg = "FFFFFF" if r_idx % 2 != 0 else "F8F9FA"

        for c_idx in range(5):
            cell = row.cells[c_idx]
            set_cell_background(cell, bg)
            set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
            p = cell.paragraphs[0]
            val = row_data[c_idx]

            if c_idx == 3:  # Ownership badge
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(val)
                r.font.bold = True
                r.font.size = Pt(8)
                color_hex = get_owner_badge_color(val)
                r.font.color.rgb = RGBColor(int(color_hex[:2], 16), int(color_hex[2:4], 16), int(color_hex[4:], 16))
            elif c_idx == 0:
                r = p.add_run(val)
                r.font.bold = True
                r.font.size = Pt(8.5)
                r.font.color.rgb = PRIMARY
            else:
                r = p.add_run(val)
                r.font.size = Pt(8)
                r.font.color.rgb = DARK_TEXT

    doc.add_paragraph().paragraph_format.space_after = Pt(16)

    # -------------------------------------------------------------
    # SECTION 4: OWNERSHIP ACCOUNTABILITY & SLA MATRIX
    # -------------------------------------------------------------
    s4_p = doc.add_paragraph()
    s4_p.paragraph_format.space_before = Pt(14)
    s4_p.paragraph_format.space_after = Pt(6)
    r_s4 = s4_p.add_run("4. Ownership Accountability & Corrective Action Matrix")
    r_s4.font.size = Pt(14)
    r_s4.font.bold = True
    r_s4.font.color.rgb = PRIMARY

    owner_matrix = [
        ("ISP", "Backoffice Systems, NOC, Central Supply & Logistics", "Automate ticket routing, replenish inventory forecast, enforce core network provisioning SLAs."),
        ("Contractor", "Field Dispatch Scheduling & Subcontractor Management", "Impose contractor SLA penalties for delayed dispatching; enforce resource capacity planning."),
        ("Technical Team Responsibility", "Field Technicians, Splicers & Installation Crews", "Mandatory quality retraining, field audit inspections, strict SOP checklist verification before ticket closure."),
        ("Customer", "Subscriber Premise, In-Home Cabling & Out-of-Scope Demands", "Transparent customer communication, commercial upsell for multi-floor cabling, clear boundary explanation."),
        ("External", "Civil Infrastructure, Municipalities & Environmental Factors", "Proactive liaison with municipal utilities, weather advisory rescheduling workflows.")
    ]

    tbl_owner = doc.add_table(rows=len(owner_matrix)+1, cols=3)
    tbl_owner.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_owner, "CCCCCC")

    o_headers = ["Ownership Group", "Operational Scope", "Standard Corrective & Preventative Action (CAPA)"]
    for j, h in enumerate(o_headers):
        cell = tbl_owner.rows[0].cells[j]
        set_cell_background(cell, "124191")
        set_cell_margins(cell, top=90, bottom=90, left=100, right=100)
        p = cell.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = WHITE

    for idx, (grp, scp, capa) in enumerate(owner_matrix, 1):
        row = tbl_owner.rows[idx]
        bg = "FFFFFF" if idx % 2 != 0 else "F8F9FA"

        c0 = row.cells[0]
        set_cell_background(c0, bg)
        set_cell_margins(c0, top=80, bottom=80, left=90, right=90)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(grp)
        r0.font.bold = True
        r0.font.size = Pt(8.5)
        color_hex = get_owner_badge_color(grp)
        r0.font.color.rgb = RGBColor(int(color_hex[:2], 16), int(color_hex[2:4], 16), int(color_hex[4:], 16))

        c1 = row.cells[1]
        set_cell_background(c1, bg)
        set_cell_margins(c1, top=80, bottom=80, left=90, right=90)
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(scp)
        r1.font.size = Pt(8)

        c2 = row.cells[2]
        set_cell_background(c2, bg)
        set_cell_margins(c2, top=80, bottom=80, left=90, right=90)
        p2 = c2.paragraphs[0]
        r2 = p2.add_run(capa)
        r2.font.size = Pt(8)

    # Output save
    doc_paths = [
        os.path.join(os.path.dirname(__file__), "Nokia_RCA_4Level_Framework.docx"),
        r"C:\Users\LENOVO\Desktop\Nokia_RCA_4Level_Framework.docx",
        r"C:\Users\LENOVO\Desktop\Nokia_RCA_4Level_Framework_Updated.docx"
    ]
    for pth in doc_paths:
        try:
            doc.save(pth)
            print(f"[OK] Generated Word Document: {pth}")
        except PermissionError:
            print(f"[WARN] Could not overwrite {pth} because it is currently open. Saved to alternatives.")
        except Exception as e:
            print(f"[WARN] Error saving {pth}: {e}")

if __name__ == "__main__":
    build_rca_document()
