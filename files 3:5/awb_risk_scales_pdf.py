from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import os

LOGO = '/mnt/data/Teal_and_Navy_Logo_for_Healthcare_Brand-removebg-preview-1.webp'
OUT = '/mnt/data/awb_wound_documentation_pack_risk_scales.pdf'

PAGE_WIDTH, PAGE_HEIGHT = letter
MARGIN = 0.65 * inch
ACCENT = colors.HexColor('#12839A')
NAVY = colors.HexColor('#163B73')
LIGHT = colors.HexColor('#EAF4F7')
MID = colors.HexColor('#D7E8ED')
TEXT = colors.HexColor('#1F2A37')
GRAY = colors.HexColor('#6B7280')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name='TitleAWB', parent=styles['Heading1'], fontName='Helvetica-Bold',
    fontSize=16.5, leading=19, textColor=NAVY, alignment=TA_LEFT, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name='SubAWB', parent=styles['BodyText'], fontName='Helvetica',
    fontSize=8.8, leading=11.5, textColor=GRAY, alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    name='SectionAWB', parent=styles['Heading2'], fontName='Helvetica-Bold',
    fontSize=11.5, leading=14, textColor=colors.white, alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    name='BodyAWB', parent=styles['BodyText'], fontName='Helvetica',
    fontSize=8.8, leading=11.3, textColor=TEXT, alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    name='TinyAWB', parent=styles['BodyText'], fontName='Helvetica',
    fontSize=7.6, leading=9.2, textColor=GRAY, alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    name='CellHead', parent=styles['BodyText'], fontName='Helvetica-Bold',
    fontSize=8.1, leading=9.4, textColor=NAVY, alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    name='CellBody', parent=styles['BodyText'], fontName='Helvetica',
    fontSize=8.1, leading=9.6, textColor=TEXT, alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    name='CellBodyCenter', parent=styles['BodyText'], fontName='Helvetica',
    fontSize=8.1, leading=9.6, textColor=TEXT, alignment=TA_CENTER,
))


def line_field(label, width_chars=20):
    underline = '_' * width_chars
    return Paragraph(f'<b>{label}</b> {underline}', styles['BodyAWB'])


def build_scale_table(scale_name, score_range, risk_bands, components):
    data = []
    data.append([
        Paragraph('<b>Component</b>', styles['CellHead']),
        Paragraph('<b>Finding / Descriptor</b>', styles['CellHead']),
        Paragraph('<b>Score</b>', styles['CellHead']),
        Paragraph('<b>Notes</b>', styles['CellHead']),
    ])
    for comp in components:
        data.append([
            Paragraph(f'<b>{comp}</b>', styles['CellBody']),
            Paragraph('Document observed findings relevant to this subscale.', styles['CellBody']),
            Paragraph('____', styles['CellBodyCenter']),
            Paragraph('________________________________', styles['CellBody']),
        ])
    summary = Table([
        [Paragraph(f'<b>{scale_name} Total Score</b>', styles['CellBody']),
         Paragraph('__________', styles['CellBodyCenter']),
         Paragraph(f'<b>Range:</b> {score_range}', styles['CellBody']),
         Paragraph(f'<b>Risk Bands:</b> {risk_bands}', styles['CellBody'])]
    ], colWidths=[1.55*inch, 1.05*inch, 1.35*inch, 3.35*inch])
    summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT),
        ('BOX', (0,0), (-1,-1), 0.8, ACCENT),
        ('INNERGRID', (0,0), (-1,-1), 0.35, colors.white),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    tbl = Table(data, colWidths=[1.55*inch, 3.15*inch, 0.75*inch, 2.45*inch], repeatRows=1)
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), MID),
        ('TEXTCOLOR', (0,0), (-1,0), NAVY),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#9DBBC7')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#C3D8E0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FBFC')]),
    ]))
    return [tbl, Spacer(1, 8), summary]


class AWBCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, page_count):
        self.setStrokeColor(colors.HexColor('#D6E3E8'))
        self.line(MARGIN, 0.58*inch, PAGE_WIDTH - MARGIN, 0.58*inch)
        self.setFillColor(GRAY)
        self.setFont('Helvetica', 8)
        self.drawString(MARGIN, 0.38*inch, 'AWB Wound Documentation Pack - Risk Scales')
        self.drawRightString(PAGE_WIDTH - MARGIN, 0.38*inch, f'Page {self._pageNumber} of {page_count}')


def make_header_table():
    logo = Image(LOGO, width=0.72*inch, height=0.72*inch)
    right = [
        Paragraph('AWB Wound Documentation Pack', styles['TitleAWB']),
        Paragraph('Single standardized documentation language across provider clinic, SNF/NH/ALF, ASC, and Ortho workflows.', styles['SubAWB'])
    ]
    tbl = Table([[logo, right]], colWidths=[0.95*inch, 6.55*inch])
    tbl.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    return tbl


def section_bar(title):
    tbl = Table([[Paragraph(title, styles['SectionAWB'])]], colWidths=[7.5*inch])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), NAVY),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    return tbl


def info_grid():
    data = [
        [line_field('Patient Name', 24), line_field('MRN', 14), line_field('DOB', 12)],
        [line_field('Facility / Site of Care', 19), line_field('Encounter Date', 12), line_field('Clinician', 15)],
        [line_field('Wound Etiology / Encounter Context', 18), line_field('Location', 15), line_field('Discipline', 13)],
    ]
    tbl = Table(data, colWidths=[3.1*inch, 2.1*inch, 2.3*inch])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('BOX', (0,0), (-1,-1), 0.7, colors.HexColor('#D3E1E8')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E1EBEF')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    return tbl


def build_pdf():
    doc = SimpleDocTemplate(
        OUT, pagesize=letter,
        leftMargin=MARGIN, rightMargin=MARGIN, topMargin=0.45*inch, bottomMargin=0.6*inch
    )
    story = []
    story.append(make_header_table())
    story.append(Spacer(1, 8))
    story.append(section_bar('Risk Scales'))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Use this page to capture standardized pressure injury risk screening language across clinic, post-acute, ASC, and orthopedic workflows. Complete the scale used by your organization and document the resulting risk category in the clinical note.',
        styles['BodyAWB']))
    story.append(Spacer(1, 7))
    story.append(info_grid())
    story.append(Spacer(1, 12))

    braden_components = ['Sensory perception', 'Moisture', 'Activity', 'Mobility', 'Nutrition', 'Friction / shear']
    norton_components = ['Physical condition', 'Mental condition', 'Activity', 'Mobility', 'Incontinence']

    story.append(section_bar('Braden Score'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Recommended when the care model uses the Braden pressure injury risk framework. Lower total scores indicate higher risk.', styles['TinyAWB']))
    story.append(Spacer(1, 6))
    story.extend(build_scale_table(
        'Braden Score',
        '6-23',
        'Very high risk 9 or less; High risk 10-12; Moderate risk 13-14; Mild risk 15-18',
        braden_components
    ))
    story.append(Spacer(1, 8))

    story.append(section_bar('Norton Score'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Recommended when the care model uses the Norton scale. Lower total scores indicate higher risk.', styles['TinyAWB']))
    story.append(Spacer(1, 6))
    story.extend(build_scale_table(
        'Norton Score',
        '5-20',
        'At risk commonly 14 or less; severe risk commonly 12 or less, per facility policy',
        norton_components
    ))
    story.append(Spacer(1, 8))



    doc.build(story, canvasmaker=AWBCanvas)

if __name__ == '__main__':
    build_pdf()
    print(OUT)
