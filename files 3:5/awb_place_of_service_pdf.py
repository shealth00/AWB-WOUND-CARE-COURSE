from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                Image, KeepTogether)
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics import renderPDF
from reportlab.pdfbase.pdfmetrics import stringWidth
import os

OUT = '/mnt/data/AWB_Place_of_Service_Selector.pdf'
LOGO = '/mnt/data/Teal_and_Navy_Logo_for_Healthcare_Brand-removebg-preview-1.webp'

NAVY = HexColor('#143D73')
TEAL = HexColor('#1C9AB7')
LIGHT = HexColor('#EAF6F8')
MID = HexColor('#D7E9EE')
TEXT = HexColor('#243746')
GRAY = HexColor('#64748B')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name='TitleAWB', fontName='Helvetica-Bold', fontSize=19, leading=23,
    textColor=NAVY, spaceAfter=4
))
styles.add(ParagraphStyle(
    name='SubtitleAWB', fontName='Helvetica', fontSize=9.5, leading=13,
    textColor=GRAY, spaceAfter=10
))
styles.add(ParagraphStyle(
    name='SectionHead', fontName='Helvetica-Bold', fontSize=10.5, leading=12,
    textColor=NAVY, spaceAfter=6
))
styles.add(ParagraphStyle(
    name='BodyAWB', fontName='Helvetica', fontSize=9.2, leading=12,
    textColor=TEXT
))
styles.add(ParagraphStyle(
    name='Tiny', fontName='Helvetica', fontSize=7.8, leading=10,
    textColor=GRAY
))


def checkbox(label, width=155, checked=False):
    d = Drawing(width, 18)
    d.add(Rect(0, 3, 10, 10, strokeColor=NAVY, fillColor=colors.white, strokeWidth=1))
    if checked:
        d.add(Line(2, 7, 4, 4, strokeColor=TEAL, strokeWidth=1.5))
        d.add(Line(4, 4, 9, 12, strokeColor=TEAL, strokeWidth=1.5))
    d.add(String(16, 4, label, fontName='Helvetica', fontSize=9.2, fillColor=TEXT))
    return d


def line_field(label, value_line=''):
    return Paragraph(f'<b>{label}</b> {value_line}', styles['BodyAWB'])


def build_pdf():
    doc = SimpleDocTemplate(
        OUT, pagesize=letter,
        leftMargin=0.62*inch, rightMargin=0.62*inch,
        topMargin=0.55*inch, bottomMargin=0.55*inch
    )
    story = []

    # Header block
    header_data = []
    logo_exists = os.path.exists(LOGO)
    logo = Image(LOGO, width=0.95*inch, height=0.95*inch) if logo_exists else ''
    title = [Paragraph('AWB Wound Documentation Pack', styles['TitleAWB']),
             Paragraph('Single standardized documentation language across provider clinic, SNF/NH/ALF, ASC, and Ortho workflows.', styles['SubtitleAWB'])]
    header_data.append([logo, title])
    header = Table(header_data, colWidths=[1.1*inch, 5.95*inch])
    header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header)
    story.append(Spacer(1, 0.1*inch))

    # Form title banner
    banner = Table([[Paragraph('Place of Service Selector', ParagraphStyle(
        'banner', parent=styles['SectionHead'], textColor=colors.white, fontSize=12, leading=14
    ))]], colWidths=[6.7*inch])
    banner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), NAVY),
        ('BOX', (0,0), (-1,-1), 0.8, NAVY),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(banner)
    story.append(Spacer(1, 0.12*inch))

    intro = Table([[
        Paragraph('Use this selector at intake, bedside rounds, wound follow-up, and pre-procedure documentation to standardize place-of-service language across the episode of care.', styles['BodyAWB'])
    ]], colWidths=[6.7*inch])
    intro.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT),
        ('BOX', (0,0), (-1,-1), 0.6, MID),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(intro)
    story.append(Spacer(1, 0.14*inch))

    # Patient / encounter block
    patient_rows = [
        [line_field('Patient Name:', '__________________________________'), line_field('DOB / MRN:', '______________________')],
        [line_field('Encounter Date:', '_______________________________'), line_field('Rendering Provider:', '______________________')],
    ]
    patient = Table(patient_rows, colWidths=[3.4*inch, 3.3*inch])
    patient.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.7, MID),
        ('INNERGRID', (0,0), (-1,-1), 0.5, MID),
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(patient)
    story.append(Spacer(1, 0.16*inch))

    # Selector options
    options = [
        checkbox('Home'),
        checkbox('Assisted Living Facility (ALF)'),
        checkbox('Nursing Home'),
        checkbox('Skilled Nursing Facility (SNF)'),
        checkbox('Office'),
        checkbox('Ambulatory Surgery Center (ASC)'),
        checkbox('Orthopedic Clinic'),
        checkbox('Other: ______________________')
    ]
    option_rows = [[options[0], options[1]], [options[2], options[3]], [options[4], options[5]], [options[6], options[7]]]
    option_tbl = Table(option_rows, colWidths=[3.3*inch, 3.4*inch])
    option_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('BOX', (0,0), (-1,-1), 0.7, MID),
        ('INNERGRID', (0,0), (-1,-1), 0.5, MID),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(Paragraph('Select current place of service', styles['SectionHead']))
    story.append(option_tbl)
    story.append(Spacer(1, 0.16*inch))

    # Standardized narrative
    narrative = Table([
        [Paragraph('Standardized note language', styles['SectionHead'])],
        [Paragraph(
            'Patient evaluated today for wound-related care in the documented place of service noted above. Site of service has been verified and is consistent with the current clinical setting, care team workflow, and documentation requirements for this encounter.',
            styles['BodyAWB']
        )],
        [Paragraph('<b>Operational use:</b> Carry the same site-of-service selection into follow-up note templates, charge review, prior authorization support, wound supply coordination, and post-procedure documentation.', styles['BodyAWB'])]
    ], colWidths=[6.7*inch])
    narrative.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), LIGHT),
        ('BOX', (0,0), (-1,-1), 0.7, MID),
        ('LINEBELOW', (0,0), (-1,0), 0.5, MID),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(narrative)
    story.append(Spacer(1, 0.16*inch))

    # Footer notes / signoff
    sign_rows = [
        [line_field('Confirmed by:', '__________________________________________'), line_field('Role:', '____________________')],
        [line_field('Signature / Initials:', '__________________________________'), line_field('Time:', '____________________')],
    ]
    sign_tbl = Table(sign_rows, colWidths=[4.6*inch, 2.1*inch])
    sign_tbl.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.7, MID),
        ('INNERGRID', (0,0), (-1,-1), 0.5, MID),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(sign_tbl)
    story.append(Spacer(1, 0.09*inch))
    story.append(Paragraph('Document control: AWB-WOUND-POS-001 | Use across Home, ALF, Nursing Home, SNF, Office, ASC, and Ortho clinic workflows.', styles['Tiny']))

    def draw_page(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(MID)
        canvas.setLineWidth(0.7)
        canvas.line(doc.leftMargin, letter[1]-0.42*inch, letter[0]-doc.rightMargin, letter[1]-0.42*inch)
        canvas.setFillColor(GRAY)
        canvas.setFont('Helvetica', 8)
        canvas.drawRightString(letter[0]-doc.rightMargin, 0.32*inch, f'Page {doc.page}')
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)

if __name__ == '__main__':
    build_pdf()
    print(OUT)
