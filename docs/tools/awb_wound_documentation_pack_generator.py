from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.units import inch

OUTPUT_PDF = "awb_wound_documentation_pack.pdf"
LOGO_PATH = "Teal_and_Navy_Logo_for_Healthcare_Brand-removebg-preview-1.webp"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleAWB', parent=styles['Title'], fontName='Helvetica-Bold',
                          fontSize=18, leading=21, textColor=colors.HexColor('#123A70'), alignment=TA_LEFT, spaceAfter=6))
styles.add(ParagraphStyle(name='SubtitleAWB', parent=styles['BodyText'], fontName='Helvetica',
                          fontSize=9.2, leading=11.5, textColor=colors.HexColor('#2D5D75'), spaceAfter=8))
styles.add(ParagraphStyle(name='SectionAWB', parent=styles['Heading2'], fontName='Helvetica-Bold',
                          fontSize=11.5, leading=13, textColor=colors.white, alignment=TA_LEFT))
styles.add(ParagraphStyle(name='Small', parent=styles['BodyText'], fontName='Helvetica',
                          fontSize=8.0, leading=9.6, textColor=colors.black))

doc = SimpleDocTemplate(OUTPUT_PDF, pagesize=letter, rightMargin=0.5*inch, leftMargin=0.5*inch,
                        topMargin=0.38*inch, bottomMargin=0.35*inch)
story = []

img = Image(LOGO_PATH, width=0.85*inch, height=0.85*inch)
title_block = [
    Paragraph("AWB Wound Documentation Pack", styles['TitleAWB']),
    Paragraph("Single standardized documentation language across provider clinic, SNF/NH/ALF, ASC, and Ortho workflows.", styles['SubtitleAWB'])
]
header_tbl = Table([[img, title_block]], colWidths=[0.95*inch, 6.95*inch])
header_tbl.setStyle(TableStyle([
    ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ('LEFTPADDING',(0,0),(-1,-1),0),
    ('RIGHTPADDING',(0,0),(-1,-1),0),
    ('TOPPADDING',(0,0),(-1,-1),0),
    ('BOTTOMPADDING',(0,0),(-1,-1),2),
]))
story.append(header_tbl)
story.append(Spacer(1, 0.04*inch))

def section(title, color_hex):
    tbl = Table([[Paragraph(title, styles['SectionAWB'])]], colWidths=[7.5*inch], rowHeights=[0.27*inch])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),colors.HexColor(color_hex)),
        ('LEFTPADDING',(0,0),(-1,-1),8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE')
    ]))
    return tbl

def style_table(tbl, bg=None):
    st = [
        ('BOX',(0,0),(-1,-1),0.8,colors.HexColor('#8AA3B7')),
        ('INNERGRID',(0,0),(-1,-1),0.55,colors.HexColor('#B7C7D4')),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',(0,0),(-1,-1),7),
        ('RIGHTPADDING',(0,0),(-1,-1),7),
        ('TOPPADDING',(0,0),(-1,-1),5),
        ('BOTTOMPADDING',(0,0),(-1,-1),8),
    ]
    if bg:
        st.append(('BACKGROUND',(0,0),(-1,-1),bg))
    tbl.setStyle(TableStyle(st))
    return tbl

story.append(section("Encounter Information", "#123A70"))
enc = [
    [Paragraph("<b>Patient Name</b><br/><br/>", styles['Small']),
     Paragraph("<b>DOB / MRN</b><br/><br/>", styles['Small']),
     Paragraph("<b>Date of Service</b><br/><br/>", styles['Small'])],
    [Paragraph("<b>Provider</b><br/><br/>", styles['Small']),
     Paragraph("<b>Facility / Setting</b><br/><br/>", styles['Small']),
     Paragraph("<b>Wound Location</b><br/><br/>", styles['Small'])]
]
enc_tbl = Table(enc, colWidths=[2.6*inch, 2.35*inch, 2.55*inch], rowHeights=[0.58*inch, 0.58*inch])
style_table(enc_tbl, colors.whitesmoke)
story.append(enc_tbl)
story.append(Spacer(1, 0.07*inch))

story.append(section("Pre / Post Debridement Measurements", "#147A91"))
pp_data = [
    [Paragraph("<b>Stage</b>", styles['Small']),
     Paragraph("<b>Length (cm)</b>", styles['Small']),
     Paragraph("<b>Width (cm)</b>", styles['Small']),
     Paragraph("<b>Depth (cm)</b>", styles['Small']),
     Paragraph("<b>Undermining</b>", styles['Small']),
     Paragraph("<b>Tunneling</b>", styles['Small'])],
    ['Pre', '', '', '', '', ''],
    ['Post', '', '', '', '', ''],
]
pp_tbl = Table(pp_data, colWidths=[0.92*inch, 1.0*inch, 1.0*inch, 1.0*inch, 1.24*inch, 1.34*inch], rowHeights=[0.28*inch, 0.38*inch, 0.38*inch])
pp_tbl.setStyle(TableStyle([
    ('BOX',(0,0),(-1,-1),0.8,colors.HexColor('#7C97A8')),
    ('INNERGRID',(0,0),(-1,-1),0.55,colors.HexColor('#B7C7D4')),
    ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#E8F3F6')),
    ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ('ALIGN',(0,0),(-1,-1),'CENTER'),
    ('FONTNAME',(0,1),(0,-1),'Helvetica-Bold'),
]))
story.append(pp_tbl)
story.append(Spacer(1, 0.06*inch))

story.append(section("Tissue Composition / Drainage / Periwound", "#123A70"))
tissue = [
    [Paragraph("<b>Granulation %</b><br/><br/>", styles['Small']),
     Paragraph("<b>Slough %</b><br/><br/>", styles['Small']),
     Paragraph("<b>Eschar %</b><br/><br/>", styles['Small']),
     Paragraph("<b>Other Tissue %</b><br/><br/>", styles['Small'])],
    [Paragraph("<b>Exudate Amount</b><br/>None / Scant / Small / Moderate / Large<br/><br/>", styles['Small']),
     Paragraph("<b>Exudate Type</b><br/>Serous / Sanguineous / Serosanguineous / Purulent<br/><br/>", styles['Small']),
     Paragraph("<b>Odor</b><br/>Absent / Present<br/><br/>", styles['Small']),
     Paragraph("<b>Periwound</b><br/>Intact / Macerated / Erythematous / Callused / Edematous / Fragile<br/><br/>", styles['Small'])],
]
tissue_tbl = Table(tissue, colWidths=[1.63*inch, 1.45*inch, 1.3*inch, 3.12*inch], rowHeights=[0.48*inch, 0.72*inch])
style_table(tissue_tbl)
tissue_tbl.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.whitesmoke)]))
story.append(tissue_tbl)
story.append(Spacer(1, 0.07*inch))

story.append(section("Skin Substitute Application Fields", "#147A91"))
skin = [
    [Paragraph("<b>Product Name</b><br/><br/>", styles['Small']),
     Paragraph("<b>Product Size</b><br/><br/>", styles['Small']),
     Paragraph("<b>HCPCS Code</b><br/><br/>", styles['Small'])],
    [Paragraph("<b>Amount Used</b><br/><br/>", styles['Small']),
     Paragraph("<b>Amount Wasted</b><br/><br/>", styles['Small']),
     Paragraph("<b>Tissue ID / Lot #</b><br/><br/>", styles['Small'])],
    [Paragraph("<b>Expiration Date</b><br/><br/>", styles['Small']),
     Paragraph("<b>Application Site Prep</b><br/>Wound bed prepared per policy / protocol<br/><br/>", styles['Small']),
     Paragraph("<b>Fixation / Dressing</b><br/><br/>", styles['Small'])],
]
skin_tbl = Table(skin, colWidths=[2.8*inch, 2.0*inch, 2.7*inch], rowHeights=[0.48*inch, 0.48*inch, 0.54*inch])
style_table(skin_tbl, colors.whitesmoke)
story.append(skin_tbl)
story.append(Spacer(1, 0.07*inch))

note = Table([[Paragraph("<b>Procedure Note Elements</b>: Debridement type, instrument used, pain tolerance, bleeding/hemostasis, wound bed response, and post-procedure dressing may be documented in the progress note section below.", styles['Small'])]], colWidths=[7.5*inch])
note.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,-1), colors.HexColor('#F4F8FB')),
    ('BOX',(0,0),(-1,-1),0.6,colors.HexColor('#B7C7D4')),
    ('LEFTPADDING',(0,0),(-1,-1),7),
    ('RIGHTPADDING',(0,0),(-1,-1),7),
    ('TOPPADDING',(0,0),(-1,-1),5),
    ('BOTTOMPADDING',(0,0),(-1,-1),5),
]))
story.append(note)
story.append(Spacer(1, 0.05*inch))

progress = Table([
    [Paragraph("<b>Progress Note / Clinical Rationale</b>", styles['Small'])],
    ["\n\n\n"]
], colWidths=[7.5*inch], rowHeights=[0.22*inch, 0.5*inch])
progress.setStyle(TableStyle([
    ('BOX',(0,0),(-1,-1),0.8,colors.HexColor('#8AA3B7')),
    ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#E8F3F6')),
    ('LEFTPADDING',(0,0),(-1,-1),7),
    ('RIGHTPADDING',(0,0),(-1,-1),7),
    ('TOPPADDING',(0,0),(-1,-1),5),
    ('BOTTOMPADDING',(0,0),(-1,-1),8),
]))
story.append(progress)
story.append(Spacer(1, 0.05*inch))

sign_tbl = Table([[Paragraph("<b>Provider Signature</b><br/><br/>", styles['Small']),
                   Paragraph("<b>Date / Time</b><br/><br/>", styles['Small'])]],
                 colWidths=[5.55*inch, 1.95*inch], rowHeights=[0.42*inch])
style_table(sign_tbl)

story.append(sign_tbl)
doc.build(story)
print(f"Created {OUTPUT_PDF}")
